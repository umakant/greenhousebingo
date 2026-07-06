import PartnershipAgreementApprovePage from "@/components/partnerships/partnership-agreement-approve-page";

type Props = { params: Promise<{ token: string }> };

export default async function Page({ params }: Props) {
  const { token } = await params;
  return <PartnershipAgreementApprovePage token={token} />;
}
