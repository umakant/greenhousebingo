import PartnershipAgreementSignPage from "@/components/partnerships/partnership-agreement-sign-page";

type Props = { params: Promise<{ token: string }> };

export default async function Page({ params }: Props) {
  const { token } = await params;
  return <PartnershipAgreementSignPage token={token} />;
}
