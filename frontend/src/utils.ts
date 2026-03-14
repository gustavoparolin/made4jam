export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parts[2]}-${monthNames[parseInt(parts[1], 10) - 1]}-${parts[0]}`;
};