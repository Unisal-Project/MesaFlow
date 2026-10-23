export function formatPrice(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function formatPriceMenu(price: string) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}