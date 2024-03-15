<?php

namespace Drupal\weather_data\Service;

trait ObservationsTrait
{
    /**
     * Check if an observation is valid.
     */
    protected function isValidObservation($obs)
    {
        if ($obs->temperature->value == null) {
            return false;
        }
        return true;
    }

    /**
     * Compute and get distance information about observation
     *
     * Returns an assoc array with information about the distance
     * of a given observation station to a specified reference
     * geometry.
     *
     * For now the reference geometry is the polygon of
     * a WFO cell.
     *
     */
    public function getObsDistanceInfo(
        $referencePoint,
        $obs,
        $wfoGeometry,
        $index = 0,
    ) {
        $obsText =
            "POINT(" .
            $obs->geometry->coordinates[0] .
            " " .
            $obs->geometry->coordinates[1] .
            ")";

        // If we have a reference point, we use that.
        // Otherwise, use the closest point from the WFO
        // geometry
        if ($referencePoint) {
            $sourcePointText =
                "POINT(" .
                $referencePoint->lon .
                " " .
                $referencePoint->lat .
                ")";
        } else {
            // We need to find the closest point in the wfoGeometry
            // to the observation point
            $distance = INF;
            $closest = null;
            foreach ($wfoGeometry as $sourcePoint) {
                $lonDiff = $obs->geometry->coordinates[0] - $sourcePoint[0];
                $latDiff = $obs->geometry->coordinates[1] - $sourcePoint[1];
                $hyp = hypot($lonDiff, $latDiff);
                if ($hyp < $distance) {
                    $distance = $hyp;
                    $closest = $sourcePoint;
                }
            }
            $sourcePointText = "POINT(" . $closest[0] . " " . $closest[1] . ")";
        }

        $sourceGeomPoints = array_map(function ($point) {
            return $point[0] . " " . $point[1];
        }, $wfoGeometry);
        $sourceGeomPoints = implode(", ", $sourceGeomPoints);
        $sourceGeomText = "POLYGON((" . $sourceGeomPoints . "))";

        $sql =
            "SELECT ST_DISTANCE_SPHERE(" .
            "ST_GEOMFROMTEXT('" .
            $obsText .
            "'), " .
            "ST_GEOMFROMTEXT('" .
            $sourcePointText .
            "')) as distance, " .
            "ST_WITHIN(ST_GEOMFROMTEXT('" .
            $obsText .
            "'), " .
            "ST_GEOMFROMTEXT('" .
            $sourceGeomText .
            "')) as within;";

        $result = $this->dataLayer->databaseFetch($sql);
        $distanceInfo = [
            "distance" => (float) $result->distance,
            "withinGridCell" => !!(int) $result->within,
            "usesReferencePoint" => !!$referencePoint,
            "obsPoint" => [
                "lon" => $obs->geometry->coordinates[0],
                "lat" => $obs->geometry->coordinates[1],
            ],
            "obsStation" => $obs->properties->station,
            "stationIndex" => $index,
        ];

        return $distanceInfo;
    }

    /**
     * Logs a serialized version of an obsDistanceInfo array
     *
     * (See getObsDistanceInfo() for how this array is produced)
     */
    public function logObservationDistanceInfo($obsDistanceInfo)
    {
        $promise = $this->newRelic->sendMetric(
            "wx.observation",
            $obsDistanceInfo["distance"],
            [
                "withinGridCell" => $obsDistanceInfo["withinGridCell"],
                "stationIndex" => $obsDistanceInfo["stationIndex"],
                "obsStation" => $obsDistanceInfo["obsStation"],
                "distance" => $obsDistanceInfo["distance"],
                "usesReferencePoint" => $obsDistanceInfo["usesReferencePoint"],
            ],
        );

        $promise->wait();
    }

    /**
     * Get the current weather conditions at a WFO grid location.
     */
    public function getCurrentConditionsFromGrid($wfo, $x, $y, $self = false)
    {
        if (!$self) {
            $self = $this;
        }
        date_default_timezone_set("America/New_York");

        $obsStations = $this->dataLayer->getObservationStations($wfo, $x, $y);

        $gridGeometry = $this->getGeometryFromGrid($wfo, $gridX, $gridY);

        $obsStationIndex = 0;
        $observationStation = $obsStations[$obsStationIndex];

        do {
            // If the temperature is not available from this observation station, try
            // the next one. Continue through the first 3 stations and then give up.
            $observationStation = $obsStations[$obsStationIndex];
            $obs = $this->dataLayer->getCurrentObservation(
                $observationStation->properties->stationIdentifier,
            );
            $obsStationIndex += 1;
        } while (
            !$this->isValidObservation($obs) &&
            $obsStationIndex < count($obsStations) - 1 &&
            $obsStationIndex < self::NUMBER_OF_OBS_STATIONS_TO_TRY
        );
        if ($obs->temperature->value == null) {
            return null;
        }

        // Log observation distance information,
        // including the WFO grid and a reference point,
        // if available
        $distanceInfo = $self->getObsDistanceInfo(
            $this->stashedPoint,
            $observationStation,
            $gridGeometry,
            $obsStationIndex - 1,
        );
        $self->logObservationDistanceInfo($distanceInfo);

        $timestamp = DateTimeUtility::stringToDate($obs->timestamp);

        $feelsLike = UnitConversion::getTemperatureScalar($obs->heatIndex);
        if ($feelsLike == null) {
            $feelsLike = UnitConversion::getTemperatureScalar($obs->windChill);
        }
        if ($feelsLike == null) {
            $feelsLike = UnitConversion::getTemperatureScalar(
                $obs->temperature,
            );
        }

        $description = ucfirst(strtolower($obs->textDescription));

        return [
            "conditions" => [
                "long" => $this->t->translate($description),
                "short" => $this->t->translate($description),
            ],
            // C to F.
            "feels_like" => $feelsLike,
            "humidity" => (int) round($obs->relativeHumidity->value ?? 0),
            "icon" => $this->getIcon($obs),
            // C to F.
            "temperature" => UnitConversion::getTemperatureScalar(
                $obs->temperature,
            ),
            "timestamp" => [
                "formatted" => $timestamp->format("l g:i A T"),
                "utc" => (int) $timestamp->format("U"),
            ],
            "wind" => [
                // Kph to mph.
                "speed" =>
                    $obs->windSpeed->value === null
                        ? null
                        : (int) round($obs->windSpeed->value * 0.6213712),
                "direction" => UnitConversion::getDirectionOrdinal(
                    $obs->windDirection->value,
                ),
            ],
            "stationInfo" => [
                "name" => $observationStation->properties->name,
                "identifier" =>
                    $observationStation->properties->stationIdentifier,
                "lat" => $observationStation->geometry->coordinates[1],
                "lon" => $observationStation->geometry->coordinates[0],
                // M to Feet
                "elevation" => UnitConversion::getLengthScalar(
                    $observationStation->properties->elevation,
                ),
            ],
        ];
    }
}
