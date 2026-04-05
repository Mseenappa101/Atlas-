import { useParams } from 'react-router-dom';

export default function BrowseState() {
  const { state } = useParams();
  return <div className="p-8 text-center font-serif text-ink">Browse — {state}</div>;
}
