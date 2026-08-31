export interface GiftCardTemplateProps {
  recipientName: string;
  senderName: string | null;
  serviceName: string;
  message: string;
  isRedeemed: boolean;
}
