import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";
import type { PhotoSlot } from "@/lib/listing-photos/types";

export type PhotoSlotInput = {
  category: string;
  listingFormat?: "single" | "set" | "" | null;
  wedgeLofts?: string[];
};

function slot(
  partial: Omit<PhotoSlot, "visibility" | "required"> & {
    visibility?: PhotoSlot["visibility"];
    required?: boolean;
  }
): PhotoSlot {
  return {
    visibility: "public",
    required: true,
    ...partial,
  };
}

const HOSEL: Omit<PhotoSlot, "key"> = {
  imageType: "hosel_serial",
  visibility: "verification_only",
  required: true,
  title: "Find the serial 🔍",
  helper: "Take a clear close-up of the hosel and serial number if visible.",
  illustrationId: "hosel",
  serialHelp: true,
};

function woodLikeSlots(): PhotoSlot[] {
  return [
    slot({
      key: "hero",
      imageType: "hero",
      title: "The hero shot ✨",
      helper: "Show us the whole club clearly.",
      illustrationId: "hero",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "Show us the face",
      helper: "Straight on works best.",
      illustrationId: "face",
    }),
    slot({
      key: "sole",
      imageType: "sole",
      title: "Flip it over 🔄",
      helper: "Get the whole sole and its markings in shot.",
      illustrationId: "sole",
    }),
    slot({
      key: "crown",
      imageType: "crown",
      title: "Show us the crown",
      helper: "Photograph the top of the head — paint, logos and wear.",
      illustrationId: "crown",
    }),
    { key: "hosel_serial", ...HOSEL },
    slot({
      key: "shaft",
      imageType: "shaft",
      title: "Show us the shaft",
      helper: "Photograph the main logo and shaft details clearly.",
      illustrationId: "shaft",
    }),
  ];
}

function drivingIronSlots(): PhotoSlot[] {
  return woodLikeSlots().filter((s) => s.imageType !== "crown");
}

function ironSingleSlots(): PhotoSlot[] {
  return [
    slot({
      key: "hero",
      imageType: "hero",
      title: "The hero shot ✨",
      helper: "Show us the whole club clearly.",
      illustrationId: "hero",
    }),
    slot({
      key: "back",
      imageType: "back",
      title: "Show us the back",
      helper: "Get the cavity and logos in shot.",
      illustrationId: "back",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "Show us the face",
      helper: "Straight on works best.",
      illustrationId: "face",
    }),
    slot({
      key: "sole",
      imageType: "sole",
      title: "Flip it over 🔄",
      helper: "Get the whole sole and its markings in shot.",
      illustrationId: "sole",
    }),
    { key: "hosel_serial", ...HOSEL },
  ];
}

function ironSetSlots(): PhotoSlot[] {
  return [
    slot({
      key: "set_overview",
      imageType: "set_overview",
      title: "The full set ✨",
      helper: "Show every club in the set together.",
      illustrationId: "set_overview",
    }),
    slot({
      key: "back",
      imageType: "back",
      title: "Back of a representative iron",
      helper: "Pick one iron and photograph the cavity clearly.",
      illustrationId: "back",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "Show us the face",
      helper: "Straight on of a representative iron.",
      illustrationId: "face",
    }),
    slot({
      key: "sole",
      imageType: "sole",
      title: "Sole and club numbers",
      helper: "Capture sole markings and club numbers.",
      illustrationId: "sole",
    }),
    { key: "hosel_serial", ...HOSEL },
  ];
}

function wedgeSingleSlots(): PhotoSlot[] {
  return [
    slot({
      key: "hero",
      imageType: "hero",
      title: "The hero shot ✨",
      helper: "Show us the whole wedge clearly.",
      illustrationId: "hero",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "Show us the face",
      helper: "Straight on works best.",
      illustrationId: "face",
    }),
    slot({
      key: "back",
      imageType: "back",
      title: "Show us the back",
      helper: "Make sure the logos and markings are clear.",
      illustrationId: "back",
    }),
    slot({
      key: "sole",
      imageType: "sole",
      title: "Show the sole",
      helper: "Get loft, bounce and grind markings in shot.",
      illustrationId: "sole",
    }),
    { key: "hosel_serial", ...HOSEL },
  ];
}

function wedgeSetSlots(lofts: string[]): PhotoSlot[] {
  const soles = lofts.map((raw, i) => {
    const loft = raw.replace(/°/g, "").trim() || `wedge-${i + 1}`;
    return slot({
      key: `wedge_sole_${loft}_${i}`,
      imageType: "wedge_specs",
      title: `${loft}° — Show the sole`,
      helper: "Capture loft, bounce and grind markings.",
      illustrationId: "sole",
      clubIdentifier: loft,
    });
  });
  return [
    slot({
      key: "set_overview",
      imageType: "set_overview",
      title: "The full wedge set ✨",
      helper: "Show every wedge together.",
      illustrationId: "set_overview",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "A representative face",
      helper: "Straight on of one wedge.",
      illustrationId: "face",
    }),
    slot({
      key: "back",
      imageType: "back",
      title: "A representative back",
      helper: "Logos and markings clearly in shot.",
      illustrationId: "back",
    }),
    ...soles,
    { key: "hosel_serial", ...HOSEL },
  ];
}

function putterSlots(): PhotoSlot[] {
  return [
    slot({
      key: "hero",
      imageType: "hero",
      title: "The full picture ✨",
      helper: "Show us the whole putter.",
      illustrationId: "hero",
    }),
    slot({
      key: "putter_address",
      imageType: "putter_address",
      title: "The golfer's view",
      helper: "Photograph it as you'd see it over the ball.",
      illustrationId: "putter_address",
    }),
    slot({
      key: "face",
      imageType: "face",
      title: "Show us the face",
      helper: "Get the full face clearly in shot.",
      illustrationId: "face",
    }),
    slot({
      key: "sole",
      imageType: "sole",
      title: "Flip it over 🔄",
      helper: "Show the whole sole and its markings.",
      illustrationId: "sole",
    }),
    slot({
      key: "putter_rear",
      imageType: "putter_rear",
      title: "Show us the back",
      helper: "Make sure the logos and markings are clear.",
      illustrationId: "putter_rear",
    }),
    {
      key: "putter_neck",
      imageType: "putter_neck",
      visibility: "verification_only",
      required: true,
      title: "Show us the neck 🔍",
      helper: "Get the neck, hosel and any serial markings clearly in shot.",
      illustrationId: "putter_neck",
      serialHelp: true,
    },
    slot({
      key: "grip",
      imageType: "grip",
      title: "And the grip 🙌",
      helper: "Show the logo and main grip details.",
      illustrationId: "grip",
    }),
  ];
}

/** Guided slots for golf equipment. Empty for clothing / accessories / bag. */
export function getPhotoSlots(input: PhotoSlotInput): PhotoSlot[] {
  const { category, listingFormat, wedgeLofts } = input;
  if (!isGolfEquipmentCategory(category)) return [];

  if (category === "Driver" || category === "Woods" || category === "Hybrids") {
    return woodLikeSlots();
  }
  if (category === "Driving Irons") return drivingIronSlots();
  if (category === "Irons") {
    return listingFormat === "set" ? ironSetSlots() : ironSingleSlots();
  }
  if (category === "Wedges") {
    if (listingFormat === "set") {
      const lofts = (wedgeLofts ?? []).map((l) => l.trim()).filter(Boolean);
      return wedgeSetSlots(lofts);
    }
    return wedgeSingleSlots();
  }
  if (category === "Putter") return putterSlots();
  return woodLikeSlots();
}

export function requiredPhotoSlots(input: PhotoSlotInput): PhotoSlot[] {
  return getPhotoSlots(input).filter((s) => s.required);
}

export function usesGuidedPhotos(category: string): boolean {
  return isGolfEquipmentCategory(category);
}
