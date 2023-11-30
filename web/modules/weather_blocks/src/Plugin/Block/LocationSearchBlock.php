<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block for searching for locations.
 *
 * @Block(
 *   id = "weathergov_location_search",
 *   admin_label = @Translation("Location search block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocationSearchBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $location = $this->getLocation();
    $place = NULL;
    $metadata = [];

    if ($location->grid) {
      $grid = $location->grid;
      $data = $this->weatherData->getPlaceFromGrid(
        $grid->wfo,
        $grid->x,
        $grid->y
      );

      if ($data) {
        $place = $data;
      }

      $metadata["grid"] = $grid;
      $metadata["geometry"] = $location->geometry;
    }

    return [
      'place' => $place,
      'metadata' => $metadata,
    ];
  }

}
