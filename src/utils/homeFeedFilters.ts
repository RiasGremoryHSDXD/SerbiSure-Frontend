export const HOME_FEED_CATEGORIES = [
  { key: null, label: 'All', icon: 'view-grid-outline', matchKeys: [] },
  { key: 'Child Care', label: 'Child Care', icon: 'face-woman-outline', matchKeys: ['child care', 'babysitter', 'baby sitter', 'nanny'] },
  { key: 'Cooking', label: 'Cooking', icon: 'silverware-fork-knife', matchKeys: ['cooking', 'cook', 'chef', 'kitchen'] },
  { key: 'Cleaning', label: 'Cleaning', icon: 'broom', matchKeys: ['cleaning', 'cleaner', 'clean', 'housekeeping', 'maid'] },
  { key: 'Laundry', label: 'Laundry', icon: 'washing-machine', matchKeys: ['laundry', 'wash', 'labada', 'ironing'] },
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
