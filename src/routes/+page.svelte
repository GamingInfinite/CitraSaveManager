<script lang="ts">
  import {
    exists,
    BaseDirectory,
    readDir,
    createDir,
    writeTextFile,
    readTextFile,
    FileEntry,
  } from "@tauri-apps/api/fs";
  import { open } from "@tauri-apps/api/dialog";
  import { appConfigDir, appDataDir } from "@tauri-apps/api/path";
  import { onMount } from "svelte/internal";

  let config = {
    accessToken: null,
  };

  let files: FileEntry[];
  let titleIDs = [];
  let titles = [];
  let DB3DS;

  let ClientID = "6tbeze6pj73ttpk7tk7qlgwp34m8c7";
  let ClientSecret = "2vz9m1h85av13c5vq0zfpqnrwy11zs";

  async function saveConfig() {
    writeTextFile("config.json", JSON.stringify(config), {
      dir: BaseDirectory.AppConfig,
    });
  }

  async function readConfig() {
    config = JSON.parse(
      await readTextFile("config.json", { dir: BaseDirectory.AppConfig })
    );
  }

  onMount(async () => {
    DB3DS = await fetch(
      "https://raw.githubusercontent.com/hax0kartik/3dsdb/master/jsons/list_US.json"
    ).then((res) => res.json());

    if (!(await exists(await appDataDir()))) {
      await createDir(await appDataDir());
    }
    if (!(await exists("config.json", { dir: BaseDirectory.AppConfig }))) {
      await saveConfig();
    } else {
      await readConfig();
    }

    if (!config.accessToken) {
      await fetch(
        "https://id.twitch.tv/oauth2/token?client_id=" +
          ClientID +
          "&client_secret=" +
          ClientSecret +
          "&grant_type=client_credentials",
        { method: "POST" }
      )
        .then((response) => response.json())
        .then((data) => {
          config.accessToken = data.access_token;
        });
      console.log(config.accessToken);
      saveConfig();
    }

    if (await exists("SDMC", { dir: BaseDirectory.AppData })) {
      files = await readDir("SDMC", {
        dir: BaseDirectory.AppData,
        recursive: true,
      });
      files = files[0].children[0].children[0].children[1].children;
      for (let i = 0; i < files.length; i++) {
        const element = files[i];
        for (let j = 0; j < element.children.length; j++) {
          const mini = element.children[j];
          titleIDs.push((element.name + mini.name).toUpperCase());
        }
      }
      for (let i = 0; i < titleIDs.length; i++) {
        const element = titleIDs[i];
        search: {
          for (let j = 0; j < DB3DS.length; j++) {
            const item = DB3DS[j];
            if (item.TitleID == element) {
              let game: string = item.Name;
              game = game.replace("™", "");
              titles.push(game);
              break search;
            }
          }
        }
      }
      for (let i = 0; i < titles.length; i++) {
        const element = titles[i];
        let cover = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": "6tbeze6pj73ttpk7tk7qlgwp34m8c7",
            Authorization: "Bearer 2gcqdqm8nrzrx5dydz25sy7d0u85lp",
          },
          body: 'fields name,artworks; limit 10; where name = "Pokémon Omega Ruby";',
        });
      }
    } else {
      createDir("SDMC", { dir: BaseDirectory.AppData });
    }
  });

  let sdmcready:boolean, datadir: string;

  async function SDMCReady() {
    sdmcready = await exists("SDMC\\Nintendo 3DS", { dir: BaseDirectory.AppData });
  }

  async function dataDir() {
    datadir = await appDataDir();
  }

  SDMCReady()
  dataDir()
</script>

<div class="flex flex-col mt-4 gap-4">
  <div class="flex flex-row w-full justify-center">
    <div class="flex flex-col gap-2">
      {#if !sdmcready}
        <p class="text-center mx-4">
          You have not set your SDMC folder to Citra Save Manager. To do this,
          please go to Citra Settings, System, Storage, then click Use Custom
          Storage, then click Change and go to {datadir + "SDMC"}
        </p>
      {:else if files}
        {#each files as file}
          {#if file.children}
            <div
              class="flex flex-row"
              on:click={() => {
                console.log(file.name);
                files = file.children;
              }}
            >
              {file.name}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>
</div>
