function formatMoney(value, currency) {
  if (value === null) return 'N/D';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}
function formatSignedMoney(value, currency) {
  if (value === null) return 'N/D';
  const formatted = formatMoney(Math.abs(value), currency);
  return value > 0 ? `-${formatted}` : value < 0 ? `+${formatted}` : formatted;
}
function formatPercent(value) { return value === null ? 'N/D' : `${value.toFixed(2)}%`; }
function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function formatCdmxDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}
module.exports = { formatMoney, formatSignedMoney, formatPercent, escapeHtml, formatCdmxDateTime };
