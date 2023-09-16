<script lang="ts">
  import {
    exists,
    BaseDirectory,
    readDir,
    createDir,
    writeTextFile,
    readTextFile,
    FileEntry,
    copyFile,
  } from "@tauri-apps/api/fs";
  import { appDataDir } from "@tauri-apps/api/path";
  import { onMount } from "svelte/internal";

  let config = {
    accessToken: null,
  };

  let files: FileEntry[];
  let titleIDs: string[] = [];
  let TitleMap: Map<string, number[]> = new Map();
  let titleCovers = [];
  let titles = [];
  let backups: Map<string, FileEntry[]> = new Map();
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

  let allGamesLoaded = false;
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
      files = files[0].children[0].children[0].children;
      getTitleFolder: {
        for (let i = 0; i < files.length; i++) {
          const element = files[i];
          if (element.name == "title") {
            files = files[i].children;
            break getTitleFolder;
          }
        }
      }

      //#region Setup Title Names and Covers
      for (let i = 0; i < files.length; i++) {
        const element = files[i];
        for (let j = 0; j < element.children.length; j++) {
          const mini = element.children[j];
          titleIDs.push((element.name + mini.name).toUpperCase());
          TitleMap.set((element.name + mini.name).toUpperCase(), [i, j]);
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
              game = game.replace("<br>", "");
              game = game.replace("  ", " ");
              titles.push(game);
              break search;
            }
          }
        }
      }
      for (let i = 0; i < titles.length; i++) {
        const element = titles[i];
        let gameID;
        let idrequest = await fetch(
          "https://corsproxy.io/?https://api.igdb.com/v4/games",
          {
            method: "POST",
            headers: {
              "Client-ID": "6tbeze6pj73ttpk7tk7qlgwp34m8c7",
              Authorization: "Bearer 2gcqdqm8nrzrx5dydz25sy7d0u85lp",
              origin: window.location.protocol + window.location.host,
            },
            body:
              'fields name,artworks; limit 10; where name = "' + element + '";',
          }
        )
          .then((response) => response.json())
          .then((response) => {
            gameID = response[0].id;
          });
        let coverRequest = await fetch(
          "https://corsproxy.io/?https://api.igdb.com/v4/covers",
          {
            method: "POST",
            headers: {
              "Client-ID": "6tbeze6pj73ttpk7tk7qlgwp34m8c7",
              Authorization: "Bearer 2gcqdqm8nrzrx5dydz25sy7d0u85lp",
              origin: window.location.protocol + window.location.host,
            },
            body: "fields *; where game = " + gameID + ";",
          }
        )
          .then((response) => response.json())
          .then((response) => {
            let url: string = response[0].url;
            url = url.substring(url.lastIndexOf("/") + 1);
            titleCovers.push(url);
            titleCovers = titleCovers;
          });
      }
      //#endregion
    } else {
      createDir("SDMC", { dir: BaseDirectory.AppData });
    }

    if (await exists("Backups", { dir: BaseDirectory.AppData })) {
      files = await readDir("Backups", {
        dir: BaseDirectory.AppData,
        recursive: true,
      });
      for (let i = 0; i < titleIDs.length; i++) {
        const element = titleIDs[i];
        let exists = false;
        for (let index = 0; index < files.length; index++) {
          const name = files[index].name;
          if (name == element) {
            exists = true;
          }
        }
        if (!exists) {
          createDir("Backups/" + element, { dir: BaseDirectory.AppData });
        }
      }
      for (let i = 0; i < files.length; i++) {
        const element = files[i];
        backups.set(titleIDs[titleIDs.indexOf(element.name)], element.children);
      }
    } else {
      createDir("Backups", { dir: BaseDirectory.AppData });
    }
    allGamesLoaded = true;
  });

  async function createBackup() {
    createDir("Backups/" + backupselect + "/" + backupname, {
      dir: BaseDirectory.AppData,
    });
    files = await readDir("SDMC", {
      dir: BaseDirectory.AppData,
      recursive: true,
    });
    files = files[0].children[0].children[0].children;
    getTitleFolder: {
      for (let i = 0; i < files.length; i++) {
        const element = files[i];
        if (element.name == "title") {
          files = files[i].children;
          break getTitleFolder;
        }
      }
    }
    files =
      files[TitleMap.get(backupselect)[0]].children[
        TitleMap.get(backupselect)[1]
      ].children;
    let storePath = files[0].name;
    for (let i = 0; i < files.length; i++) {
      const element = files[i];
      if (element.children) {
        createDir(
          "Backups\\" + backupselect + "\\" + backupname + "\\" + element.name,
          { dir: BaseDirectory.AppData }
        );
      } else {
        copyFile(
          element.path,
          "Backups\\" + backupselect + "\\" + backupname + "\\" + element.name,
          { dir: BaseDirectory.AppData }
        );
      }
      backupTraverseFolder(element, storePath);
    }
    creatingBackup = false;
    backupsmodal = !backupsmodal;
    reloadBackups();
  }

  async function restoreBackup() {
    files = await readDir("SDMC", {
      dir: BaseDirectory.AppData,
      recursive: true,
    });
    files = files[0].children[0].children[0].children;
    getTitleFolder: {
      for (let i = 0; i < files.length; i++) {
        const element = files[i];
        if (element.name == "title") {
          files = files[i].children;
          break getTitleFolder;
        }
      }
    }
    files =
      files[TitleMap.get(backupselect)[0]].children[
        TitleMap.get(backupselect)[1]
      ].children;
    let storePath = files[0].path;
    let read = await readDir("Backups\\" + backupselect + "\\" + backupname, {
      dir: BaseDirectory.AppData,
      recursive: true,
    });
    for (let i = 0; i < read.length; i++) {
      const element = read[i];
      restoreTraverseFolder(element, storePath);
    }
  }

  async function backupTraverseFolder(FileEntry, path) {
    for (let i = 0; i < FileEntry.children.length; i++) {
      const element: FileEntry = FileEntry.children[i];
      if (element.children) {
        await createDir(
          "Backups\\" +
            backupselect +
            "\\" +
            backupname +
            "\\" +
            path +
            "\\" +
            element.name,
          { dir: BaseDirectory.AppData }
        );
        backupTraverseFolder(element, path + "/" + element.name);
      } else {
        copyFile(
          element.path,
          "Backups\\" +
            backupselect +
            "\\" +
            backupname +
            "\\" +
            path +
            "\\" +
            element.name,
          { dir: BaseDirectory.AppData }
        );
      }
    }
  }

  async function restoreTraverseFolder(FileEntry, path) {
    for (let i = 0; i < FileEntry.children.length; i++) {
      const element: FileEntry = FileEntry.children[i];
      if (element.children) {
        restoreTraverseFolder(element, path + "\\" + element.name);
      } else {
        copyFile(element.path, path + "\\" + element.name, {
          dir: BaseDirectory.AppData,
        });
      }
    }
  }

  async function reloadBackups() {
    files = await readDir("Backups", {
      dir: BaseDirectory.AppData,
      recursive: true,
    });
    for (let i = 0; i < files.length; i++) {
      const element = files[i];
      backups.set(titleIDs[titleIDs.indexOf(element.name)], element.children);
      backups = backups;
    }
  }

  //#region Svelte UI Setup
  let sdmcready: boolean, datadir: string;
  let backupsmodal: boolean = true;
  let backupselect: string,
    creatingBackup: boolean = false;
  let backupname: string;

  async function SDMCReady() {
    sdmcready = await exists("SDMC\\Nintendo 3DS", {
      dir: BaseDirectory.AppData,
    });
  }

  async function dataDir() {
    datadir = await appDataDir();
  }

  SDMCReady();
  dataDir();
  //#endregion
</script>

<div
  class="flex flex-col mt-4 gap-4"
  class:pointer-events-none={!allGamesLoaded}
>
  <div class="flex flex-row w-full justify-center">
    {#if !sdmcready}
      <div class="flex flex-col gap-2">
        <p class="text-center mx-4">
          You have not set your SDMC folder to Citra Save Manager. To do this,
          please go to Citra Settings, System, Storage, then click Use Custom
          Storage, then click Change and go to {datadir + "SDMC"}
        </p>
      </div>
    {:else if titleCovers}
      <div class="grid grid-cols-4 w-full justify-items-center">
        {#each titleCovers as file, i}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="flex flex-col text-center items-center"
            on:click={() => {
              backupselect = titleIDs[i];
              backupsmodal = !backupsmodal;
              console.log(backupselect);
              creatingBackup = false;
            }}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <img
              class="w-36 h-48"
              src="https://images.igdb.com/igdb/image/upload/t_1080p/{file}"
            />
            {titles[i]}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
<div
  class="flex flex-row absolute left-0 top-0 w-full overflow-hidden justify-center z-20 pointer-events-none"
  class:hidden={backupsmodal}
>
  <div
    class="flex flex-col min-w-[50%] h-screen justify-center z-20 pointer-events-none"
  >
    <div
      class="flex flex-row bg-base-100 min-h-[33%] rounded-lg relative pointer-events-auto"
    >
      <div class="flex flex-col w-full">
        <div class="flex flex-row">
          <p class="text-lg font-bold mt-4 ml-4">
            {titles[titleIDs.indexOf(backupselect)]}
          </p>
        </div>
        <div class="flex flex-row justify-center">
          <div class="flex flex-col">
            {#if backups.get(backupselect)}
              <table class="table table-zebra">
                <!-- head -->
                <thead>
                  <tr>
                    <th />
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {#each backups.get(backupselect) as backup, i}
                    <!-- row 1 -->
                    <tr
                      on:click={() => {
                        backupname = backup.name;
                        restoreBackup();
                        backupsmodal = !backupsmodal;
                      }}
                    >
                      <th>{i + 1}</th>
                      <td>{backup.name}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
            <div class="flex flex-row gap-2 items-center my-2 mx-4">
              {#if creatingBackup}
                <div>X</div>
                <div class="join">
                  <input
                    type="text"
                    placeholder="Backup Name..."
                    class="input input-bordered w-full join-item"
                    bind:value={backupname}
                  />
                  <button class="btn join-item" on:click={createBackup}>
                    Create Backup
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
      <button
        class="btn btn-circle btn-accent absolute right-4 bottom-4"
        on:click={() => {
          creatingBackup = true;
        }}
      >
        <svg class="w-4 h-4 fill-current" viewBox="0 0 45.402 45.402">
          <path
            d="M41.267,18.557H26.832V4.134C26.832,1.851,24.99,0,22.707,0c-2.283,0-4.124,1.851-4.124,4.135v14.432H4.141 c-2.283,0-4.139,1.851-4.138,4.135c-0.001,1.141,0.46,2.187,1.207,2.934c0.748,0.749,1.78,1.222,2.92,1.222h14.453V41.27 c0,1.142,0.453,2.176,1.201,2.922c0.748,0.748,1.777,1.211,2.919,1.211c2.282,0,4.129-1.851,4.129-4.133V26.857h14.435 c2.283,0,4.134-1.867,4.133-4.15C45.399,20.425,43.548,18.557,41.267,18.557z"
          /></svg
        >
      </button>
    </div>
  </div>
</div>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="flex flex-row absolute left-0 top-0 w-full overflow-hidden justify-center bg-opacity-30 bg-black z-0"
  class:hidden={backupsmodal}
  on:click={() => {
    backupsmodal = !backupsmodal;
  }}
>
  <div class="flex flex-col h-screen" />
</div>
