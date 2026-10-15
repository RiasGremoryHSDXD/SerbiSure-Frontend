import type { useWorkLocation } from './hooks/useWorkLocation';

export type WorkLocationForm = ReturnType<typeof useWorkLocation>;

export function workLocationError(form: WorkLocationForm): string | null {
  if (!form.selectedRegion || !form.selectedProvince || !form.selectedCity || !form.selectedBarangay) return 'Select the work Region, Province, City / Municipality and Barangay.';
  if (!form.streetAddress.trim()) return 'Enter the house number, street or zone.';
  if (!/^\d{4}$/.test(form.zipcode.trim())) return 'Enter a valid 4-digit ZIP code.';
  return null;
}

