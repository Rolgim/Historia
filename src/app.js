import {
  loadData,
  activeSnapshot,
  loadHistoricalIndex,
  loadHistoricalGeoJSON
} from "./data.js";

import {
  getDeterministicColor,
  escapeHtml
} from "./utils.js";

import { createTheme, allValuesOf } from "./theme.js";
import { createPanel } from "./panel.js";
import { createTimeline } from "./timeline.js";
import { createThemeSwitcher } from "./theme-switcher.js";


// ============================================================
// CARTE
// ============================================================

const worldBounds = L.latLngBounds(
  L.latLng(-90, -180),
  L.latLng(90, 180)
);

const map = L.map("map", {
  center: [30, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 10,
  zoomControl: true,
  maxBounds: worldBounds,
  maxBoundsViscosity: 1.0
});

map.scrollWheelZoom.disable();


// ============================================================
// FOND DE CARTE
// ============================================================

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "Map data © OpenStreetMap",
    opacity: 0.4,
    noWrap: true,
    bounds: worldBounds
  }
).addTo(map);


// ============================================================
// LAYERS
// ============================================================

let regionsLayer = null;
let eventsLayer = null;


// ============================================================
// ÉTAT VISUEL D'UN ÉVÉNEMENT (visibilité + fondu dans le temps)
// ============================================================
//
// Fonction unique utilisée PARTOUT où un marqueur d'événement est
// stylé (rendu initial, défilement du curseur temporel, sélection
// au clic) pour éviter que ces trois endroits se contredisent —
// c'est cette incohérence qui faisait apparaître des événements
// avant leur date ou changeait tous les points au clic.
// ============================================================

const EVENT_PEAK_YEARS = 30;
const EVENT_FADE_YEARS = 200;
const EVENT_MIN_FILL_OPACITY = 0.05;
const EVENT_MIN_STROKE_OPACITY = 0.2;
const EVENT_PEAK_RADIUS = 8;
const EVENT_BASE_RADIUS = 5;
const EVENT_MIN_RADIUS = 3;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function computeEventVisualState(eventYear, currentYear) {

  const age =
    Number(currentYear) - Number(eventYear);

  if (age < 0) {

    // Événement pas encore survenu : toujours invisible, quoi qu'il
    // arrive ailleurs (sélection, changement de thème, etc.).
    return {
      visible: false,
      fillOpacity: 0,
      strokeOpacity: 0,
      weight: 0,
      radius: 0
    };
  }

  const fadeT =
    Math.max(
      0,
      Math.min(
        1,
        (age - EVENT_PEAK_YEARS) / EVENT_FADE_YEARS
      )
    );

  return {
    visible: true,
    fillOpacity: lerp(0.3, EVENT_MIN_FILL_OPACITY, fadeT),
    strokeOpacity: lerp(1, EVENT_MIN_STROKE_OPACITY, fadeT),
    weight: 1,
    radius:
      age <= EVENT_PEAK_YEARS
        ? EVENT_PEAK_RADIUS
        : lerp(EVENT_BASE_RADIUS, EVENT_MIN_RADIUS, fadeT)
  };
}

function getCurrentSliderYear() {

  const slider =
    document.getElementById("year-slider");

  return slider
    ? parseInt(slider.value, 10)
    : 1000;
}


// ============================================================
// HISTORICAL BASEMAP
// ============================================================

let historicalIndex = null;

let displayedHistoricalFilename = null;

let historicalRequestId = 0;


// ============================================================
// MAIN
// ============================================================

async function main() {

  const {
    historicalData,
    historicalNames,
    events
  } = await loadData();


  historicalIndex =
    await loadHistoricalIndex();


  console.log(
    "Enriched historical entities:",
    historicalNames.length
  );

  console.log(
    "Available historical snapshots:",
    historicalIndex.length
  );


  const Theme =
    createTheme(
      historicalNames,
      events
    );


  const activeSnapshotFunc =
    activeSnapshot;


  // ==========================================================
  // PANEL
  // ==========================================================

  const Panel =
    createPanel({

      HISTORICAL_DATA:
        historicalData,

      HISTORICAL_NAMES:
        historicalNames,

      EVENTS:
        events,

      Theme,

      MapRenderer: {

        setSelectedEvent: (eventIdx) => {

          if (!eventsLayer) {
            return;
          }

          const currentYear =
            getCurrentSliderYear();

          eventsLayer.eachLayer((layer) => {

            const eventIndex =
              layer.options.eventIndex;

            const event =
              events[eventIndex];

            if (!event) {
              return;
            }

            const state =
              computeEventVisualState(
                event.year,
                currentYear
              );

            // Un événement futur reste invisible, même sélectionné :
            // la sélection ne doit jamais faire apparaître un point
            // hors de sa plage temporelle.
            if (!state.visible) {

              layer.setStyle({
                fillOpacity: 0,
                opacity: 0,
                weight: 0
              });

              layer.setRadius(0);
              return;
            }

            const isSelected =
              eventIndex === eventIdx;

            // La sélection ajoute un surlignage PAR-DESSUS l'état
            // naturel (visibilité/fondu) du point, au lieu de le
            // remplacer — les autres points visibles ne bougent pas.
            layer.setStyle({

              fillOpacity:
                isSelected
                  ? 1
                  : state.fillOpacity,

              opacity:
                isSelected
                  ? 1
                  : state.strokeOpacity,

              color:
                isSelected
                  ? "#7a2e1f"
                  : "#3a2c1a",

              weight:
                isSelected
                  ? 3
                  : state.weight

            });

            layer.setRadius(
              isSelected
                ? state.radius + 3
                : state.radius
            );

          });
        },

        get year() {

          const slider =
            document.getElementById(
              "year-slider"
            );

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        }

      },

      activeSnapshot:
        activeSnapshotFunc

    });


  // ==========================================================
  // SÉLECTEUR DE MODE (territoire / religion / langue / ethnie)
  // ==========================================================

  const ThemeSwitcher =
    createThemeSwitcher({

      Theme,

      Panel,

      MapRenderer: {

        get year() {

          const slider =
            document.getElementById("year-slider");

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        },

        refresh: () => {

          const slider =
            document.getElementById("year-slider");

          const year =
            slider
              ? parseInt(slider.value, 10)
              : 1000;

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        },

        // Légende du mode "territoire" : dérivée des polygones
        // actuellement affichés (sujet -> couleur déterministe).
        getHistoricalLegend: () => {

          if (!regionsLayer) {
            return [];
          }

          const seen = new Map();

          regionsLayer.eachLayer((layer) => {

            const props = layer.feature?.properties || {};

            const subject =
              cleanValue(props.SUBJECTO) ||
              cleanValue(props.NAME) ||
              "Unknown";

            if (subject === "Unknown" || seen.has(subject)) {
              return;
            }

            seen.set(
              subject,
              getDeterministicColor(subject)
            );
          });

          return [...seen.entries()]
            .map(([value, color]) => ({ value, color }))
            .sort((a, b) => a.value.localeCompare(b.value));
        }

      }

    });


  // ==========================================================
  // TIMELINE
  // ==========================================================

  const Timeline =
    createTimeline({

      MapRenderer: {

        setYear: (year) => {

          const slider =
            document.getElementById(
              "year-slider"
            );

          if (slider) {
            slider.value = year;
          }

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        },

        get year() {

          const slider =
            document.getElementById(
              "year-slider"
            );

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        },

        refresh: () => {

          const slider =
            document.getElementById(
              "year-slider"
            );

          const year =
            slider
              ? parseInt(slider.value, 10)
              : 1000;

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        }

      },

      Panel

    });


  // ==========================================================
  // LAYERS
  // ==========================================================

  await initGeoJSONLayers(
    historicalNames,
    events,
    Theme,
    Panel,
    activeSnapshotFunc
  );


  ThemeSwitcher.init();

  Timeline.init();
}


// ============================================================
// INITIALISATION DES LAYERS
// ============================================================

async function initGeoJSONLayers(
  historicalNames,
  events,
  Theme,
  Panel,
  activeSnapshot
) {

  const currentYear =
    parseInt(
      document.getElementById("year-slider")?.value,
      10
    ) || 1000;


  // ==========================================================
  // FRONTIÈRES HISTORIQUES
  // ==========================================================

  // IMPORTANT :
  // C'était ici l'erreur :
  //
  // await updateHistoricalBorders(year, ...)
  //
  // "year" n'existe pas dans cette fonction.
  //
  // On utilise currentYear.
  //

  await updateHistoricalBorders(
    currentYear,
    Theme,
    historicalNames,
    Panel
  );


  // ==========================================================
  // ÉVÉNEMENTS
  // ==========================================================

  const eventsGeoJSON = {
    type: "FeatureCollection",

    features: events
      .map((event, index) => {

        const lat =
          parseFloat(event.lat);

        const lon =
          parseFloat(event.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          console.warn(
            "Event skipped: invalid coordinates",
            event
          );

          return null;
        }

        return {

          type: "Feature",

          properties: {

            id:
              `event-${index}`,

            eventIndex:
              index,

            title:
              event.title,

            year:
              event.year,

            // Conservé pour compatibilité
            regionId:
              event.regionId,

            // Éventuellement utilisé par le nouveau panel
            historicalName:
              event.historicalName,

            historicalNames:
              event.historicalNames,

            ...event
          },

          geometry: {

            type: "Point",

            coordinates: [
              lon,
              lat
            ]
          }

        };

      })
      .filter(Boolean)
  };


  eventsLayer =
    L.geoJSON(
      eventsGeoJSON,
      {

        pointToLayer: (
          feature,
          latlng
        ) => {

          const initialState =
            computeEventVisualState(
              feature.properties.year,
              getCurrentSliderYear()
            );

          return L.circleMarker(
            latlng,
            {

              radius:
                initialState.radius,

              fillColor:
                Theme.colorFor(
                  Theme.current,
                  feature.properties[
                    Theme.current
                  ] || "#fff"
                ),

              color:
                "#3a2c1a",

              weight:
                initialState.weight,

              fillOpacity:
                initialState.fillOpacity,

              opacity:
                initialState.strokeOpacity,

              eventIndex:
                feature.properties.eventIndex

            }
          );
        },


        onEachFeature: (
          feature,
          layer
        ) => {

          layer.on(
            "click",
            (e) => {

              e.originalEvent?.stopPropagation();

              Panel.showEvent(
                feature.properties.eventIndex,
                null
              );

            }
          );

        }

      }
    )
    .addTo(map);


  // ==========================================================
  // PREMIÈRE MISE À JOUR
  // ==========================================================

  await updateMapForYear(
    currentYear,
    historicalNames,
    events,
    Theme,
    activeSnapshot,
    Panel
  );
}


// ============================================================
// FRONTIÈRES HISTORIQUES
// ============================================================

async function updateHistoricalBorders(
  year,
  Theme,
  historicalNames,
  Panel
) {

  const requestId =
    ++historicalRequestId;


  try {

    const historical =
      await loadHistoricalGeoJSON(year);


    if (
      requestId !== historicalRequestId
    ) {
      return;
    }


    // --------------------------------------------------------
    // Le snapshot demandé est le même que celui affiché.
    // --------------------------------------------------------

    if (
      displayedHistoricalFilename ===
      historical.filename
    ) {

      updateHistoricalBorderStyles(
        Theme,
        historicalNames
      );

      return;
    }


    // --------------------------------------------------------
    // Supprime l'ancien layer.
    // --------------------------------------------------------

    if (regionsLayer) {

      map.removeLayer(
        regionsLayer
      );

      regionsLayer = null;
    }


    // --------------------------------------------------------
    // Crée le nouveau layer.
    // --------------------------------------------------------

    regionsLayer =
      L.geoJSON(
        historical.geojson,
        {

          style: (feature) => {

            return historicalBorderStyle(
              feature,
              Theme,
              historicalNames
            );
          },


          onEachFeature: (
            feature,
            layer
          ) => {

            setupHistoricalFeature(
              feature,
              layer,
              historicalNames,
              Panel
            );

          }

        }
      );


    regionsLayer.addTo(map);


    displayedHistoricalFilename =
      historical.filename;


    // Les événements restent au-dessus.
    if (eventsLayer) {
      eventsLayer.bringToFront();
    }


    console.log(
      `Historical map: ${historical.year} → ${historical.filename}`
    );

  }
  catch (error) {

    console.error(
      `Error loading historical map for ${year}`,
      error
    );

  }
}


// ============================================================
// STYLE DES FRONTIÈRES
// ============================================================

// ============================================================
// HACHURES SVG POUR ENTITÉS À VALEURS MULTIPLES
// ============================================================
//
// Quand une entité a plusieurs religions/langues/ethnies à la fois, on
// la remplit avec un motif de rayures diagonales combinant les deux
// valeurs les plus notables, plutôt qu'une seule couleur qui gommerait
// l'info. Les patterns sont injectés dans le <svg> interne de Leaflet.
// ============================================================

const stripePatternIds = new Set();

function getMapSvgDefs() {

  const svg =
    map.getPane("overlayPane")?.querySelector("svg");

  if (!svg) {
    return null;
  }

  let defs = svg.querySelector("defs");

  if (!defs) {
    defs = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "defs"
    );
    svg.insertBefore(defs, svg.firstChild);
  }

  return defs;
}

function stripePatternId(colorA, colorB) {

  const clean = (s) =>
    String(s).replace(/[^a-zA-Z0-9]/g, "");

  return `stripe-${clean(colorA)}-${clean(colorB)}`;
}

function ensureStripePattern(colorA, colorB) {

  const id = stripePatternId(colorA, colorB);

  if (stripePatternIds.has(id)) {
    return id;
  }

  const defs = getMapSvgDefs();

  if (!defs) {
    return null;
  }

  const ns = "http://www.w3.org/2000/svg";

  const pattern =
    document.createElementNS(ns, "pattern");

  pattern.setAttribute("id", id);
  pattern.setAttribute("width", "8");
  pattern.setAttribute("height", "8");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", "rotate(45)");

  const rectA = document.createElementNS(ns, "rect");
  rectA.setAttribute("width", "8");
  rectA.setAttribute("height", "8");
  rectA.setAttribute("fill", colorA);
  pattern.appendChild(rectA);

  const rectB = document.createElementNS(ns, "rect");
  rectB.setAttribute("width", "4");
  rectB.setAttribute("height", "8");
  rectB.setAttribute("fill", colorB);
  pattern.appendChild(rectB);

  defs.appendChild(pattern);
  stripePatternIds.add(id);

  return id;
}


function historicalBorderStyle(
  feature,
  Theme,
  historicalNames
) {

  const props =
    feature?.properties || {};


  const precision =
    Number(
      props.BORDERPRECISION
    ) || 2;


  // ==========================================================
  // MODE TERRITOIRE
  // ==========================================================

  if (
    Theme.current === "territory"
  ) {

    const subject =
      cleanValue(
        props.SUBJECTO
      ) ||
      cleanValue(
        props.NAME
      ) ||
      "Unknown";


    const isUnknown =
      subject === "Unknown";


    const fillOpacity =
      isUnknown
        ? 0
        : precision === 3
          ? 0.38
          : precision === 2
            ? 0.30
            : 0.22;


    return {

      fillColor:
        isUnknown
          ? "transparent"
          : getDeterministicColor(
              subject
            ),

      fillOpacity,

      color:
        precision === 3
          ? "#3a2c1a"
          : "#6b5a45",

      weight:
        precision === 3
          ? 1
          : 0.7,

      opacity:
        precision === 3
          ? 0.9
          : 0.55
    };
  }


  // ==========================================================
  // AUTRES MODES (religion / langue / ethnie)
  // ==========================================================
  //
  // On colore par la valeur DOMINANTE (première valeur Wikidata) de
  // l'entité enrichie correspondante. Le détail complet (toutes les
  // valeurs) reste consultable dans le panneau au clic. Les valeurs
  // hors du "top N" sont regroupées visuellement sous une même teinte
  // grise ("Autres"), voir theme.js.
  // ==========================================================

  const subjectForLookup =
    cleanValue(props.SUBJECTO) ||
    cleanValue(props.NAME) ||
    "";

  const entity =
    subjectForLookup
      ? findHistoricalEntity(
          cleanValue(props.NAME),
          cleanValue(props.SUBJECTO),
          historicalNames || []
        )
      : null;

  const values =
    entity
      ? allValuesOf(entity, Theme.current)
      : [];

  let fillColor = "transparent";
  let fillOpacity = 0;

  if (values.length > 1) {

    // Entité à valeurs multiples : hachures combinant les deux
    // valeurs les plus notables plutôt qu'une seule couleur qui
    // effacerait l'info.
    const colorA = Theme.colorFor(Theme.current, values[0]);
    const colorB = Theme.colorFor(Theme.current, values[1]);
    const patternId = ensureStripePattern(colorA, colorB);

    fillColor = patternId ? `url(#${patternId})` : colorA;
    fillOpacity = 0.45;

  } else if (values.length === 1) {

    fillColor = Theme.colorFor(Theme.current, values[0]);
    fillOpacity = 0.32;
  }

  return {

    fillColor,

    fillOpacity,

    color:
      "#6b5a45",

    weight:
      precision === 3
        ? 1
        : 0.7,

    opacity:
      precision === 3
        ? 0.75
        : 0.45
  };
}


// ============================================================
// MET À JOUR LES STYLES
// ============================================================

function updateHistoricalBorderStyles(
  Theme,
  historicalNames
) {

  if (!regionsLayer) {
    return;
  }

  regionsLayer.eachLayer(
    (layer) => {

      if (!layer.feature) {
        return;
      }

      layer.setStyle(
        historicalBorderStyle(
          layer.feature,
          Theme,
          historicalNames
        )
      );

    }
  );
}


// ============================================================
// INTERACTION FRONTIÈRE HISTORIQUE
// ============================================================

function setupHistoricalFeature(
  feature,
  layer,
  historicalNames,
  Panel
) {

  const props =
    feature?.properties || {};


  const name =
    cleanValue(
      props.NAME
    ) ||
    "Unknown";


  const subject =
    cleanValue(
      props.SUBJECTO
    );


  const partOf =
    cleanValue(
      props.PARTOF
    );


  let html =
    `<strong>${escapeHtml(name)}</strong>`;


  if (
    subject &&
    subject !== name
  ) {

    html +=
      `<br>${escapeHtml(subject)}`;
  }


  if (partOf) {

    html +=
      `<br><small>${escapeHtml(partOf)}</small>`;
  }


  layer.bindTooltip(
    html,
    {
      sticky: true,
      direction: "top"
    }
  );


  // ----------------------------------------------------------
  // CLIC
  // ----------------------------------------------------------

  layer.on("click", (e) => {

    e.originalEvent?.stopPropagation();


    const entity =
      findHistoricalEntity(
        name,
        subject,
        historicalNames
      );


    Panel.showTerritoryInfo({

      name,

      subject,

      partOf,

      historicalEntity:
        entity || null

    });

  });
}


// ============================================================
// NORMALISATION
// ============================================================

function normalizeForMatch(value) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}


// ============================================================
// CORRESPONDANCE AOURednik <-> NOUVEAU DATASET
// ============================================================

function findHistoricalEntity(
  name,
  subject,
  historicalNames
) {

  if (
    !Array.isArray(historicalNames)
  ) {
    return null;
  }


  const candidates = [
    name,
    subject
  ]
    .map(normalizeForMatch)
    .filter(Boolean);


  if (!candidates.length) {
    return null;
  }


  for (
    const entity of historicalNames
  ) {

    const names = [

      entity.name,

      ...(Array.isArray(entity.variants)
        ? entity.variants
        : [])

    ]
      .map(normalizeForMatch)
      .filter(Boolean);


    if (
      names.some(
        (candidateName) =>
          candidates.includes(
            candidateName
          )
      )
    ) {

      return entity;
    }

  }


  return null;
}


// ============================================================
// UPDATE GLOBAL
// ============================================================

async function updateMapForYear(
  year,
  historicalNames,
  events,
  Theme,
  activeSnapshot,
  Panel
) {

  // ----------------------------------------------------------
  // 1. FRONTIÈRES
  // ----------------------------------------------------------

  await updateHistoricalBorders(
    year,
    Theme,
    historicalNames,
    Panel
  );


  // ----------------------------------------------------------
  // 2. ÉVÉNEMENTS
  // ----------------------------------------------------------

  if (eventsLayer) {

    eventsLayer.eachLayer(
      (layer) => {

        const eventIndex =
          layer.options.eventIndex;

        const event =
          events[eventIndex];


        if (!event) {
          return;
        }


        const state =
          computeEventVisualState(
            event.year,
            year
          );

        layer.setStyle({
          fillOpacity: state.fillOpacity,
          opacity: state.strokeOpacity,
          weight: state.weight
        });

        layer.setRadius(state.radius);

        if (!state.visible) {
          layer.closePopup();
        }

      }
    );
  }


  // ----------------------------------------------------------
  // 3. COULEURS
  // ----------------------------------------------------------

  updateEventStyles(
    events,
    Theme
  );
}


// ============================================================
// ÉVÉNEMENTS : COULEURS
// ============================================================

// ============================================================
// COULEUR D'UN ÉVÉNEMENT = COULEUR DU PAYS SOUS LE POINT
// ============================================================
//
// En mode "territoire", un point d'événement doit avoir EXACTEMENT
// la même couleur que le polygone qui le contient à l'année
// affichée — pas une couleur dérivée de son propre champ texte
// "territory", qui ne correspond pas forcément mot pour mot au nom
// du polygone (ex. "Kingdom of France" vs "France") et donnait donc
// des couleurs sans rapport. On cherche ici le polygone réel qui
// contient les coordonnées de l'événement.
// ============================================================

function pointInRing(pt, ring) {

  let inside = false;

  for (
    let i = 0, j = ring.length - 1;
    i < ring.length;
    j = i++
  ) {

    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect =
      (yi > pt[1]) !== (yj > pt[1]) &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygonCoords(pt, coords) {

  if (!coords || !coords.length) {
    return false;
  }

  if (!pointInRing(pt, coords[0])) {
    return false;
  }

  for (let i = 1; i < coords.length; i++) {
    if (pointInRing(pt, coords[i])) {
      return false; // à l'intérieur d'un trou
    }
  }

  return true;
}

function pointInGeometry(pt, geometry) {

  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygonCoords(pt, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some(
      (poly) => pointInPolygonCoords(pt, poly)
    );
  }

  return false;
}

function findPolygonSubjectAt(lon, lat) {

  if (!regionsLayer) {
    return null;
  }

  const pt = [Number(lon), Number(lat)];
  let found = null;

  regionsLayer.eachLayer((layer) => {

    if (found) {
      return;
    }

    const feature = layer.feature;

    if (!feature) {
      return;
    }

    if (pointInGeometry(pt, feature.geometry)) {

      const props = feature.properties || {};

      found =
        cleanValue(props.SUBJECTO) ||
        cleanValue(props.NAME) ||
        null;
    }
  });

  return found;
}


function updateEventStyles(
  events,
  Theme
) {

  if (!eventsLayer) {
    return;
  }


  eventsLayer.eachLayer(
    (layer) => {

      const eventIndex =
        layer.options.eventIndex;

      const event =
        events[eventIndex];


      if (!event) {
        return;
      }


      const isTerritory =
        Theme.current === "territory";

      const fillColor =
        isTerritory
          ? getDeterministicColor(
              findPolygonSubjectAt(event.lon, event.lat) ||
                event.territory ||
                "Unknown"
            )
          : Theme.colorFor(
              Theme.current,
              event[Theme.current] || "#fff"
            );


      layer.setStyle({

        fillColor

      });

    }
  );
}


// ============================================================
// UTILITAIRE
// ============================================================

function cleanValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


// ============================================================
// START
// ============================================================

main().catch(
  (error) => {

    console.error(error);

    const hint =
      document.getElementById(
        "empty-hint"
      );

    if (hint) {

      hint.textContent =
        "Error loading data. Please use a local server.";

    }

  }
);