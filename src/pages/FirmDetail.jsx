import { useParams } from 'react-router-dom';

export default function FirmDetail() {
  const { id } = useParams();
  return <div className="p-8 text-center font-serif text-ink">Firm Detail — {id}</div>;
}
