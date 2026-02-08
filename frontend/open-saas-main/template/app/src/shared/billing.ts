
export const CREDIT_PACKAGES = [
  { id: 'pack_10', credits: 10, price: 10.00, popular: false },
  { id: 'pack_50', credits: 50, price: 45.00, popular: true },
  { id: 'pack_100', credits: 100, price: 80.00, popular: false },
] as const;

export type CreditPackageId = typeof CREDIT_PACKAGES[number]['id'];

export const getCreditPackage = (id: string) => {
  return CREDIT_PACKAGES.find(p => p.id === id);
};
