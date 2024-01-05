<?php

namespace Drupal\weather_data\Service;

class GeonamesLookup
{
    private static $instance = null;

    private static $sourceFile = __DIR__ . '/cities500.txt';

    private $rows = [];
    
    private function __construct(){
        $fileHandle = fopen(self::$sourceFile, 'r');
        while (($row = fgetcsv($fileHandle, 1000, "\t", "\"", '$')) !== FALSE){
            $lat = floatval($row[4] ?? null);
            $lon = floatval($row[5] ?? null);
            $city = $row[1] ?? null;
            $state = $row[10] ?? null;
            $countryCode = $row[8] ?? null;
            if($lat && $lon && $city && $state && $countryCode == "US"){
                array_push(
                    $this->rows,
                    [
                        $lat,
                        $lon,
                        $city,
                        $state
                    ]
                );
            }
        }
    }

    public static function getInstance(){
        if(self::$instance == null){
            self::$instance = new GeonamesLookup();
        }
        return self::$instance;
    }

    public function lookup(float $lat, float $lon){
        $minDistance = INF;
        $bestMatch;

        for($i = 0; $i < count($this->rows); $i++){
            $compLat = $this->rows[$i][0];
            $compLon = $this->rows[$i][1];
            $a = $compLat - $lat;
            $b = $compLon - $lon;
            $distance = hypot($a, $b);
            if($distance < $minDistance){
                $minDistance = $distance + 0;
                $bestMatch = $this->rows[$i];
            }
        }

        return $bestMatch;
    }
}
