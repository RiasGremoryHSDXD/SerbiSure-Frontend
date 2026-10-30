export const HOME_FEED_CATEGORIES = [
  { key: null, label: 'All', icon: 'grid-outline', matchKeys: [] },
  { key: 'Cleaning', label: 'Cleaning', icon: 'sparkles-outline', matchKeys: ['cleaning', 'cleaner', 'clean', 'housekeeping', 'maid'] },
  { key: 'Child Care', label: 'Child Care', icon: 'happy-outline', matchKeys: ['child care', 'babysitter', 'baby sitter', 'nanny'] },
  { key: 'Cooking', label: 'Cooking', icon: 'restaurant-outline', matchKeys: ['cooking', 'cook', 'chef', 'kitchen'] },
  { key: 'Caregiver', label: 'Caregiver', icon: 'heart-outline', matchKeys: ['caregiver', 'caregiving', 'elderly care', 'elder care', 'senior', 'special needs'] },
  { key: 'Laundry', label: 'Laundry', icon: 'shirt-outline', matchKeys: ['laundry', 'wash', 'labada', 'ironing'] },
  { key: 'All-around', label: 'All-around', icon: 'home-outline', matchKeys: ['all around', 'all-around', 'general'] },
] as const;

export type HomeFeedCategory = Exclude<typeof HOME_FEED_CATEGORIES[number]['key'], null>;

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchesHomeFeedFilters(
  categories: readonly string[],
  searchValues: readonly string[],
  selectedCategory: HomeFeedCategory | null,
  searchQuery: string,
) {
  const normalizedCategories = categories.map(normalize);
  if (selectedCategory) {
    const category = HOME_FEED_CATEGORIES.find((item) => item.key === selectedCategory);
    const matchesCategory = category?.matchKeys.some((key) => normalizedCategories.some((value) => value.includes(key)));
    const isAllAround = normalizedCategories.some((value) => value.includes('all around'));
    if (!matchesCategory && !isAllAround) return false;
  }

  const query = normalize(searchQuery);
  return !query || [...categories, ...searchValues].some((value) => normalize(value).includes(query));
}
