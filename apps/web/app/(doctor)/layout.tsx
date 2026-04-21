import DoctorNav from '@/components/doctor/DoctorNav';

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorNav>
      <div className="page-enter">{children}</div>
    </DoctorNav>
  );
}
