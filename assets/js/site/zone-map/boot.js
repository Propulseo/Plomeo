// Point d'entrée de la carte de zone. Isolé du module pour que l'échec éventuel
// d'un import ne casse pas le reste de la page.

import { mountZoneMap } from './index.js'

mountZoneMap().catch((e) => console.error('[zone-map] montage impossible :', e))
