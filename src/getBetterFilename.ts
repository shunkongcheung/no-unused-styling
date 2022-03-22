export const getBetterFilename = (filename: string, rootDir: string) => {
  filename = filename.replace(rootDir, "").replace(/\\/g, "/")
  filename = filename.replace(".tsx", "").replace(".ts", "")
  filename = filename.replace(".js", "").replace(".jsx", "");

  // this is hard coded. in realiity, this can be retrieved from tsconfig .includes
  filename = filename.replace("Src/", "").replace("Tests/", "");

  if(filename.startsWith("/")) filename = filename.replace("/", "");
  return filename;
}
