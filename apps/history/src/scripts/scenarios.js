export async function loadScenarios() {
  const manifestResponse = await fetch("./scenarios/index.json");
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load scenario manifest (${manifestResponse.status})`);
  }

  const manifest = await manifestResponse.json();
  const scenarios = await Promise.all(
    manifest.map(async (entry) => {
      const scriptResponse = await fetch(`./scenarios/${entry.file}`);
      if (!scriptResponse.ok) {
        throw new Error(`Failed to load scenario script "${entry.file}"`);
      }

      return {
        ...entry,
        script: await scriptResponse.text(),
      };
    })
  );

  return scenarios;
}
