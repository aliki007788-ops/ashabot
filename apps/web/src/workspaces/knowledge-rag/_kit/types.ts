export interface WorkspaceManifest {
  /** slug خوشه (با seed یکی است) */
  slug: string;
  title: string;
  icon: string;
  accent: string;
  /** نسخه‌ی خود میزکار (مستقل از کیت) */
  version: string;
  tagline: string;
}
