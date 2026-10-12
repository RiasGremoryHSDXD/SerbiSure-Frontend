import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getRegions, getProvinces, getCities, getBarangays, getZipCodeForCity,
  type Region, type Province, type CityMunicipality, type Barangay, type LocationItem } from '../../../shared/services/locationService';

/** Cascading PSGC selections. A parent change invalidates its children and outstanding requests. */
export function useWorkLocation(visible: boolean) {
  const [selectedRegion, setRegion] = useState<Region | null>(null);
  const [selectedProvince, setProvince] = useState<Province | null>(null);
  const [selectedCity, setCity] = useState<CityMunicipality | null>(null);
  const [selectedBarangay, setBarangay] = useState<Barangay | null>(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [floorUnit, setFloorUnit] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [regionsList, setRegions] = useState<Region[]>([]);
  const [provincesList, setProvinces] = useState<Province[]>([]);
  const [citiesList, setCities] = useState<CityMunicipality[]>([]);
  const [barangaysList, setBarangays] = useState<Barangay[]>([]);
  const [activePicker, setActivePicker] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);
  const [loadingLocations, setLoading] = useState(false);
  const version = useRef(0);
  const resetWorkLocation = () => {
    version.current++;
    setRegion(null); setProvince(null); setCity(null); setBarangay(null);
    setStreetAddress(''); setFloorUnit(''); setZipcode(''); setActivePicker(null); setLoading(false);
    setProvinces([]); setCities([]); setBarangays([]);
  };
  useEffect(() => {
    version.current++;
    if (!visible) resetWorkLocation();
    return () => { version.current++; };
  }, [visible]);

  const load = async (task: (request: number) => Promise<void>) => {
    const request = ++version.current;
    setLoading(true);
    try { await task(request); }
    catch { if (request === version.current) Alert.alert('Location Unavailable', 'Please reconnect and open the location selector again.'); }
    finally { if (request === version.current) setLoading(false); }
  };
  const handleOpenRegionPicker = () => {
    setActivePicker('region');
    void load(async request => { const items = await getRegions(); if (request === version.current) setRegions(items); });
  };
  const handleSelectRegion = (item: LocationItem) => {
    const region = item as Region;
    setRegion(region); setProvince(null); setCity(null); setBarangay(null); setZipcode('');
    setProvinces([]); setCities([]); setBarangays([]);
    void load(async request => {
      const items = await getProvinces(region.code);
      if (request !== version.current) return;
      setProvinces(items);
      const metro = items.length === 1 && items[0]?.name === 'Metro Manila' ? items[0] : null;
      if (metro) {
        setProvince(metro);
        const cities = await getCities(metro.code, region.code);
        if (request === version.current) setCities(cities);
      }
    });
  };
  const handleOpenProvincePicker = () => {
    if (!selectedRegion) return;
    setActivePicker('province');
    void load(async request => { const items = await getProvinces(selectedRegion.code); if (request === version.current) setProvinces(items); });
  };
  const handleSelectProvince = (item: LocationItem) => {
    const province = item as Province;
    setProvince(province); setCity(null); setBarangay(null); setZipcode(''); setCities([]); setBarangays([]);
    void load(async request => { const items = await getCities(province.code, selectedRegion?.code); if (request === version.current) setCities(items); });
  };
  const handleOpenCityPicker = () => {
    if (!selectedProvince) return;
    setActivePicker('city');
    void load(async request => { const items = await getCities(selectedProvince.code, selectedRegion?.code); if (request === version.current) setCities(items); });
  };
  const handleSelectCity = (item: LocationItem) => {
    const city = item as CityMunicipality;
    setCity(city); setBarangay(null); setBarangays([]); setZipcode(getZipCodeForCity(city.code, city.name) || '');
    void load(async request => { const items = await getBarangays(city.code); if (request === version.current) setBarangays(items); });
  };
  const handleOpenBarangayPicker = () => {
    if (!selectedCity) return;
    setActivePicker('barangay');
    void load(async request => { const items = await getBarangays(selectedCity.code); if (request === version.current) setBarangays(items); });
  };
  const handleSelectBarangay = (item: LocationItem) => { setBarangay(item as Barangay); };
  const applyProfileAddress = (profile: { region?: string | null; province?: string | null; city?: string | null; barangay?: string | null; street?: string | null; zipcode?: string | null }) => {
    resetWorkLocation();
    setStreetAddress(profile.street || ''); setZipcode(profile.zipcode || '');
    // Match genuine profile values against PSGC; never invent a jurisdiction for incomplete addresses.
    const match = <T extends LocationItem>(items: T[], value?: string | null): T | undefined => {
      if (!value?.trim()) return undefined;
      const clean = (text: string) => text.toLowerCase().replace(/^(brgy\.?|barangay)\s+/, '').trim();
      const wanted = clean(value);
      return items.find(item => [item.name, item.displayName, ...(item.aliases || [])].some(name => name && clean(name) === wanted));
    };
    void load(async request => {
      const regions = await getRegions();
      if (request !== version.current) return;
      setRegions(regions);
      const region = match(regions, profile.region);
      if (!region) return;
      setRegion(region);
      const provinces = await getProvinces(region.code);
      if (request !== version.current) return;
      setProvinces(provinces);
      const province = match(provinces, profile.province) || (provinces.length === 1 && provinces[0]?.name === 'Metro Manila' ? provinces[0] : undefined);
      if (!province) return;
      setProvince(province);
      const cities = await getCities(province.code, region.code);
      if (request !== version.current) return;
      setCities(cities);
      const city = match(cities, profile.city);
      if (!city) return;
      setCity(city);
      if (!profile.zipcode) setZipcode(getZipCodeForCity(city.code, city.name) || '');
      const barangays = await getBarangays(city.code);
      if (request !== version.current) return;
      setBarangays(barangays); setBarangay(match(barangays, profile.barangay) || null);
    });
  };
  return { selectedRegion, selectedProvince, selectedCity, selectedBarangay, streetAddress, setStreetAddress,
    floorUnit, setFloorUnit, zipcode, setZipcode, regionsList, provincesList, citiesList, barangaysList,
    loadingLocations, activePicker, setActivePicker, handleOpenRegionPicker, handleSelectRegion,
    handleOpenProvincePicker, handleSelectProvince, handleOpenCityPicker, handleSelectCity,
    handleOpenBarangayPicker, handleSelectBarangay, resetWorkLocation, applyProfileAddress };
}
