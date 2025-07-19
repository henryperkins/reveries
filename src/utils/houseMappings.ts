import { HostParadigm, HouseParadigm } from '@/types';

/**
 * Bi-directional mapping between Westworld “host” paradigms and Hogwarts
 * “house” paradigms introduced in the Four Houses of Inquiry infographic.
 *
 * Gryffindor  ↔ Dolores   (bold advocacy / decisive action)
 * Hufflepuff ↔ Teddy     (collaboration / protection)
 * Ravenclaw  ↔ Bernard   (analysis / theory-building)
 * Slytherin  ↔ Maeve     (strategy / leverage)
 */
export const hostToHouse: Record<HostParadigm, HouseParadigm> = {
  dolores: 'gryffindor',
  teddy: 'hufflepuff',
  bernard: 'ravenclaw',
  maeve: 'slytherin'
};

export const houseToHost: Record<HouseParadigm, HostParadigm> = {
  gryffindor: 'dolores',
  hufflepuff: 'teddy',
  ravenclaw: 'bernard',
  slytherin: 'maeve'
};

export function mapHostToHouse(paradigm: HostParadigm): HouseParadigm {
  return hostToHouse[paradigm];
}

export function mapHouseToHost(house: HouseParadigm): HostParadigm {
  return houseToHost[house];
}
