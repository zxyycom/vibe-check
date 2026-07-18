const [tool, ...args] = process.argv.slice(2);

if (args.includes("--version")) {
  const versions: Record<string, string> = {
    jscpd: "jscpd 5.0.11",
    lizard: "lizard 1.17.10",
    scc: "scc version 3.7.0"
  };
  const version = tool === undefined ? undefined : versions[tool];
  if (version === undefined) {
    throw new Error(`unknown controlled scanner: ${tool ?? "missing"}`);
  }
  console.log(version);
} else {
  const files = args.filter((value) => value.endsWith(".ts")).sort();
  if (tool === "scc") {
    console.log("Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC");
    for (const file of files) {
      console.log(`TypeScript,${file},eligible.ts,12,10,1,1,6,200,10`);
    }
  } else if (tool === "lizard") {
    console.log("NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line");
    for (const file of files) {
      console.log(`12,4,30,1,12,fixture,${file},classifyScore,classifyScore,1,12`);
    }
  } else {
    throw new Error(`unexpected controlled scanner invocation: ${tool ?? "missing"}`);
  }
}
