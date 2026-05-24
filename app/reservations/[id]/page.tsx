import ReservationView from '../../components/ReservationView';

export default async function ReservationPage({ params }: { params: { id: string } }) {
  return <ReservationView reservationId={params.id} />;
}
