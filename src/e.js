import { socksDispatcher } from "fetch-socks";

const dispatcher = socksDispatcher({ type: 5, host: "::1", port: 1080 });

const response = await fetch("https://api.myip.com", { dispatcher });
console.log(await response.json());

const other = await fetch("https://api.myip.com/");
console.log(await other.json());
