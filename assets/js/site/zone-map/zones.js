// Géographie de la zone d'intervention : paliers de délai, projection, contour du Var.
//
// Principe : on ne dessine pas de contour autour des communes, on raisonne en RAYON
// depuis Toulon. Le palier d'une commune est DÉDUIT de sa distance — impossible donc
// qu'une commune se retrouve hors de sa propre zone sur la carte.

const KM_LON = 81.27 // à 43° de latitude
const KM_LAT = 111.13

export const HUB = { nom: 'Toulon', lat: 43.1258, lon: 5.9304 }

/** Paliers, du plus proche au plus lointain. `km` = rayon extérieur. */
export const ZONES = [
  {
    id: 'r1', km: 9, min: 15, temps: '15 min', nom: "Cœur d'agglo",
    pitch: "Toulon et sa couronne immédiate. Fuite, panne de chaudière : on est chez vous dans le quart d'heure.",
  },
  {
    id: 'r2', km: 18, min: 30, temps: '30 min', nom: 'Couronne',
    pitch: 'Du littoral de Bandol à Hyères jusqu’à la vallée du Gapeau. Dépannages et chantiers.',
  },
  {
    id: 'r3', km: 40, min: 45, temps: '45 min', nom: 'Zone élargie',
    pitch: 'Le Lavandou et le Haut-Var toulonnais. On s’y déplace pour les chantiers planifiés.',
  },
]
export const zoneById = (id) => ZONES.find((z) => z.id === id)

export const distKm = (lat, lon) => Math.hypot((lon - HUB.lon) * KM_LON, (lat - HUB.lat) * KM_LAT)

/**
 * Enrichit les lignes de la table `communes` : distance, palier, rôle.
 * Les communes sans coordonnées sont écartées de la carte (elles restent en puces).
 */
export function buildCommunes(rows) {
  return rows
    .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)))
    .map((r) => {
      const lat = Number(r.lat)
      const lon = Number(r.lon)
      const d = distKm(lat, lon)
      return {
        n: r.nom,
        lat,
        lon,
        d,
        hub: d < 0.6,
        major: !!LABELS[r.nom], // les villes nommées en permanence portent aussi le ping
        z: (ZONES.find((z) => d <= z.km) || ZONES[ZONES.length - 1]).id,
      }
    })
    .sort((a, b) => a.d - b.d)
}

/** Repli si la base est injoignable : le hero garde sa carte. */
export const FALLBACK = [
  { nom: 'Toulon', lat: 43.1258, lon: 5.9304 },
  { nom: 'La Valette-du-Var', lat: 43.1372, lon: 5.9853 },
  { nom: 'La Seyne-sur-Mer', lat: 43.1, lon: 5.8831 },
  { nom: 'Saint-Mandrier-sur-Mer', lat: 43.0781, lon: 5.93 },
  { nom: 'Le Revest-les-Eaux', lat: 43.1764, lon: 5.9167 },
  { nom: 'La Garde', lat: 43.125, lon: 6.0111 },
  { nom: 'Ollioules', lat: 43.14, lon: 5.8478 },
  { nom: 'Le Pradet', lat: 43.1058, lon: 6.0231 },
  { nom: 'Six-Fours-les-Plages', lat: 43.0942, lon: 5.84 },
  { nom: 'La Farlède', lat: 43.1667, lon: 6.0433 },
  { nom: 'Sanary-sur-Mer', lat: 43.1194, lon: 5.8 },
  { nom: 'Solliès-Ville', lat: 43.1822, lon: 6.0367 },
  { nom: 'Solliès-Pont', lat: 43.1911, lon: 6.0433 },
  { nom: 'La Crau', lat: 43.15, lon: 6.0733 },
  { nom: 'La Moutonne', lat: 43.163, lon: 6.083 },
  { nom: 'Solliès-Toucas', lat: 43.2111, lon: 6.0433 },
  { nom: 'Bandol', lat: 43.1353, lon: 5.7533 },
  { nom: 'Belgentier', lat: 43.2433, lon: 6.0111 },
  { nom: 'Hyères', lat: 43.1203, lon: 6.1286 },
  { nom: 'Cuers', lat: 43.2378, lon: 6.0708 },
  { nom: 'Garéoult', lat: 43.325, lon: 6.0433 },
  { nom: 'Rocbaron', lat: 43.31, lon: 6.0867 },
  { nom: 'Le Lavandou', lat: 43.1372, lon: 6.3667 },
]

/* ---------- Contour du Var (viewBox 1000×845) ---------- */
export const VAR_PATH =
  'M76.4 88.5 L98.1 55.1 L131.2 63 L151.2 93.2 L176.8 89.3 L195.4 72.6 L199 57.8 L212.5 61 L223.6 72.5 L235.2 94.1 L257.9 100 L273.2 128.2 L286.3 149.2 L297.5 121.3 L329.8 106.5 L349.8 75.9 L370.8 76 L390 68 L416.8 32.9 L438.9 7.8 L468.2 6.8 L475 26.8 L524.6 64.5 L560.4 68.8 L577.9 65.2 L593.6 16.4 L612.7 9.7 L636.5 8.7 L667.9 6.5 L679.9 0.4 L696.3 26.4 L718.2 15.4 L738.4 3.5 L760.7 16.4 L768.4 27.8 L769.6 40.5 L784.7 62.7 L803.6 52.6 L832.3 73.9 L861.3 83.2 L870 102.4 L875.3 122.1 L864.7 151.1 L890.6 180.4 L908.9 191.8 L925.7 208.1 L964.2 214.8 L979.9 223.8 L972.4 242.6 L975.9 260.7 L957.6 292.4 L970.8 301.3 L961.3 327.8 L989.8 349.8 L992.3 361.8 L987.7 386.8 L968.8 399.3 L953.7 409.7 L940 405.4 L938.4 426 L916.3 419.6 L887.3 429.4 L856.7 415.8 L840.2 441.2 L828.3 472.9 L824.9 498 L792.8 510.5 L778.3 536 L755.5 550.3 L731 564.9 L727.9 584.3 L757.2 583.3 L787.4 583.8 L793.9 571.4 L814.9 583.2 L798.6 605.8 L788.6 612.8 L799.1 656.8 L771.7 671.3 L757.3 691.1 L739.2 672.5 L707.2 666 L687.2 683.1 L678.4 691.1 L655.5 707.4 L632.5 699.5 L617 712.5 L586.3 708.7 L566.9 720 L550.8 740.1 L557.5 759.1 L542.6 774.2 L523.9 766.5 L511.3 752.5 L494.8 746.2 L476.9 738.8 L432.1 743.8 L413.2 752.3 L394.3 773.9 L386.6 819.8 L385 840.2 L374.1 830.2 L359.3 831.6 L341.1 829.6 L360.6 827 L372.8 805.1 L358.5 779.1 L316.9 781.2 L286.1 784.9 L287.6 767.1 L250.6 753.3 L223.3 753.2 L217.9 741.5 L182.4 750.7 L191.8 757.2 L186.9 781.2 L204.4 776.8 L220.5 778.1 L225.3 797.7 L213.4 792 L189.8 785.7 L164.2 804.7 L134.4 815 L108.1 795.1 L121 769.8 L118.2 744.6 L103.9 743.9 L92.1 735.3 L90.2 719.6 L54.7 722.1 L30.5 714.5 L30.4 688.2 L22.4 675.2 L15.3 667.3 L17.2 632.4 L38 608.9 L50.8 593 L83.7 565.7 L63.8 544.4 L27.5 532.1 L26.5 516.4 L30.2 497.3 L30.2 476.6 L21 439.2 L53.6 428.7 L94.2 428.6 L103.6 416.4 L75 401.3 L46.2 355.1 L35.9 340.2 L44.5 317.5 L48.4 289.4 L41.8 271.3 L10.4 260.8 L0 247.1 L21.1 221.5 L34.6 177.8 L52.6 169.3 L88.2 157.9 L113.6 145.9 L107.1 123.1 L101.3 100.5 L76.4 88.5 Z'

/** Projection de ce contour, retro-calculée depuis ses points de villes d'origine. */
export const proj = (lon, lat) => ({
  x: 212.9 + (lon - 5.9304) * 784.9,
  y: 735.4 - (lat - 43.1258) * 1088.9,
})

/** ~9.7 unités par km, quasi isotrope : les cercles de rayon sont légitimes. */
export const PX_PER_KM = 9.7

/* Noms affichés en permanence, calés à la main : aucun point de commune ne tombe
   dans un nom, aucun nom n'en chevauche un autre (vérifié aux deux cadrages).
   La Valette est absente volontairement : la grappe La Farlède / La Crau /
   La Moutonne l'entoure de trois côtés. Son nom apparaît au survol. */
export const LABELS = {
  Toulon: { dx: 0, dy: -15, anchor: 'middle' },
  Bandol: { dx: 0, dy: -16, anchor: 'middle' },
  'La Seyne-sur-Mer': { dx: -10, dy: 34, anchor: 'end', short: 'La Seyne' },
  'Six-Fours-les-Plages': { dx: -16, dy: -2, anchor: 'end', short: 'Six-Fours' },
  Hyères: { dx: 16, dy: 26, anchor: 'start' },
  Cuers: { dx: 16, dy: 7, anchor: 'start' },
  'Le Lavandou': { dx: 16, dy: 7, anchor: 'start' },
  Garéoult: { dx: 0, dy: -13, anchor: 'middle' },
}
/** Jeu réduit pour le hero : de l'air avant tout. */
export const HERO_LABELS = ['Toulon', 'Bandol', 'La Seyne-sur-Mer', 'Hyères', 'Cuers', 'Le Lavandou']
