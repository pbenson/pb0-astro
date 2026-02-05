export const limitToLR = (input: string) => {
  // Filter out any characters that are not 'L' or 'R'
  return  input.toUpperCase().split('').filter(char => char === 'L' || char === 'R').join('');
};
