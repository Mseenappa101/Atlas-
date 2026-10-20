import useCatalog from './useCatalog';

// Open postings come with the full firm data (gated), so they share the catalog load.
export default function useListings() {
  const { listings, loading, error } = useCatalog();
  return { listings, loading, error };
}
