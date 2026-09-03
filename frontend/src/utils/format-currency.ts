import { themeConfig } from '@/configs/theme-config';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(themeConfig.app.localCurrency, {
    style: 'currency',
    currency: themeConfig.app.currency,
    minimumFractionDigits: 0,
  }).format(value);
};
