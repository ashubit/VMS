export const KIOSKS = 'kiosks';

export function kioskOut(kiosk) {
  return {
    id: kiosk._id.toString(),
    tenantId: kiosk.tenantId?.toString() || null,
    name: kiosk.name,
    location: kiosk.location,
    mode: kiosk.mode,
    active: kiosk.active !== false
  };
}
