export const getBetterFilename = (filename: string) =>  {
  if(filename.includes("Src")) filename = filename.replace(/\\/g, "/").split("Src/")[1]
  if(filename.includes("Test")) filename = filename.replace(/\\/g, "/").split("Tests/")[1]
  
  if(!filename) return "";

  return filename.replace(".tsx", "").replace(".ts", "")
}
