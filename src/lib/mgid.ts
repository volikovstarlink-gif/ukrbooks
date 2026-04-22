export interface MgidWidgetConfig {
  siteId: string | undefined;
  widgetId: string | undefined;
}

export function getMgidWidgetConfig(placement: string): MgidWidgetConfig {
  const overrides: Record<string, string | undefined> = {
    'book-near-video': process.env.NEXT_PUBLIC_MGID_WIDGET_ID_BOOK_NEAR_VIDEO,
  };
  return {
    siteId: process.env.NEXT_PUBLIC_MGID_SITE_ID,
    widgetId: overrides[placement] ?? process.env.NEXT_PUBLIC_MGID_WIDGET_ID,
  };
}

export function isMgidConfigured(placement: string): boolean {
  const { siteId, widgetId } = getMgidWidgetConfig(placement);
  return Boolean(siteId && widgetId);
}
