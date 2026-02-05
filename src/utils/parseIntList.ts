export const parseIntList = (delimitedListOfInteger: string) => {
  //observations will be a string
  return delimitedListOfInteger
    .trim()
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/,/g, " ")
    .replace(/  /g, " ")
    .replace(/  /g, " ")
    .replace(/  /g, " ")
    .split(" ")
    .map((x: string) => parseInt(x));
};
