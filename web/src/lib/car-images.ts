// Real photos of the three current BMW model generations, from Wikimedia Commons.
// All are CC BY-SA (3.0 DE / 4.0): reuse requires visible attribution (author +
// licence + link) and a note that they were modified (resized, WebP). Render
// `credit` next to each image and link it to `page`. Per-file details live in the
// JSON sidecars in web/public/images/cars/.

export interface CarImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit: string;
  licence: string;
  page: string;
}

export const CAR_IMAGES: Record<"F70" | "G60" | "G70", { front: CarImage; second: CarImage }> = {
  F70: {
    front: {
      src: "/images/cars/f70-front.webp",
      alt: "Grey BMW 1 Series (F70, 120) hatchback, front three-quarter view",
      width: 1600,
      height: 1065,
      credit: "Photo: Alexander-93, CC BY-SA 4.0, via Wikimedia Commons",
      licence: "CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:BMW_120_(F70)_IMG_1166.jpg",
    },
    second: {
      src: "/images/cars/f70-rear.webp",
      alt: "White BMW 1 Series (F70, 118d M Sport) hatchback, rear three-quarter view",
      width: 1600,
      height: 810,
      credit: "Photo: M 93, CC BY-SA 3.0 de, via Wikimedia Commons",
      licence: "CC BY-SA 3.0 de",
      page: "https://commons.wikimedia.org/wiki/File:BMW_118d_M_Sportpaket_(F70)_%E2%80%93_h_30032025.jpg",
    },
  },
  G60: {
    front: {
      src: "/images/cars/g60-front.webp",
      alt: "Grey BMW i5 eDrive40 M Sport (5 Series G60) sedan, front three-quarter view",
      width: 1600,
      height: 956,
      credit: "Photo: MrWalkr, CC BY-SA 4.0, via Wikimedia Commons",
      licence: "CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:2023_BMW_i5.jpg",
    },
    second: {
      src: "/images/cars/g60-interior.webp",
      alt: "BMW 5 Series (G60) cockpit with curved display and steering wheel",
      width: 1600,
      height: 1067,
      credit: "Photo: Ethan Llamas, CC BY-SA 4.0, via Wikimedia Commons",
      licence: "CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:BMW_520i_G60_Oxide_Grey_Metallic_03.jpg",
    },
  },
  G70: {
    front: {
      src: "/images/cars/g70-front.webp",
      alt: "Oxide Grey BMW i7 xDrive60 (7 Series G70) sedan in a showroom, front three-quarter view",
      width: 1600,
      height: 1200,
      credit: "Photo: Damian B Oh, CC BY-SA 4.0, via Wikimedia Commons",
      licence: "CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:BMW_G70E_i7_xDrive60_Design_Pure_Excellence_BMW_Individual_Oxide_Grey_(2).jpg",
    },
    second: {
      src: "/images/cars/g70-rear.webp",
      alt: "Grey BMW i7 xDrive60 (7 Series G70) sedan at BMW Welt, rear three-quarter view",
      width: 1600,
      height: 1126,
      credit: "Photo: Wikisympathisant, CC BY-SA 4.0, via Wikimedia Commons",
      licence: "CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:2023-04_BMW_i7_xDrive60_rear-side.jpg",
    },
  },
};
