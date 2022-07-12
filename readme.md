# spa-custom-security-plugin

This is a plugin for [nodeboot-spa-server](https://github.com/usil/nodeboot-spa-server).

## Adding the plugin

First install that module in the your SPA project.

```cmd
    npm install spa-custom-security-plugin
```

So for SPA project `package.json` will have:

```json
  "dependencies": {
    ...
    "spa-custom-security-plugin": "^1.0.0"
    ...
  },
```

Then create a `server-settings.json` file (if it is not created already) and inside it put:

```json
  "plugins": [{ "module": "spa-custom-security-plugin" }],
```

## Adding variables to the server settings file

You need to add a `server-settings.json` file, its content wont show in the `/settings.json` endpoint. Create it with the following variables:

| Variable                     | Description                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `cookieMaxAge`               | The session cookie duration in milliseconds                                                                   |
| `sessionSecret`              | A secret fot the session                                                                                      |
| `errorPage`                  | The error page to redirect to. If it is missing it will show a json response                                  |
| `loginPage`                  | The page where the login button is at. If it is missing any access to any page will trigger the login process |
| `successPage`                | The page where after the login is completed the server redirects to                                           |
| `publicPages`                | Pages that do not need protection                                                                             |
| `applicationIdentifier`      | The identifier fow the application                                                                            |
| `oauth2ClientId`             | The client id to use the oauth2 service                                                                       |
| `oauth2BaseUrl`              | The base URL to call the oauth2 service                                                                       |
| `oauth2AuthorizeUrlEndpoint` | The path to the service endpoint to get the authorization url                                                 |
| `oauth2TokenUserEndpoint`    | The path to the service endpoint to get the access token                                                      |
| `oauth2RefreshTokenEndpoint` | The path to the service endpoint to refresh the access token                                                  |
| `oauth2MaxAllowedIdleTime`   | The amount of time that the users can be idle in seconds                                                      |

JSON example:

```json
{
  "cookieMaxAge": 60000,
  "sessionSecret": "${SESSION_SECRET}",
  "errorPage": "/error",
  "loginPage": "/login",
  "successPage": "/success",
  "publicPages": [],
  "applicationIdentifier": "web1",
  "oauth2ClientId": "${OAUTH2_CLIENT_ID}",
  "oauth2BaseUrl": "${SECURITY_OAUTH2_BASE_URL}",
  "oauth2RefreshTokenEndpoint": "${SECURITY_OAUTH2_REFRESH_TOKEN_URL}",
  "oauth2TokenUserEndpoint": "${SECURITY_OAUTH2_TOKEN_USER_URL}",
  "oauth2AuthorizeUrlEndpoint": "${SECURITY_OAUTH2_AUTHORIZE_URL}",
  "oauth2MaxAllowedIdleTime": "${SECURITY_OAUTH2_MAX_SECONDS_ALLOWED_FOR_IDLE_USER}"
}
```

You need to add the following environment variables to replace the values with the pattern `${*}`

```text
SESSION_SECRET=secret
OAUTH2_CLIENT_ID=<>
SECURITY_OAUTH2_BASE_URL=<>
SECURITY_OAUTH2_TOKEN_USER_URL=/v1/nonspec/oauth2/auth/user
SECURITY_OAUTH2_AUTHORIZE_URL=/v1/nonspec/oauth2/authorize-url
SECURITY_OAUTH2_REFRESH_TOKEN_URL=/v1/nonspec/oauth2/token/refresh
SECURITY_OAUTH2_MAX_SECONDS_ALLOWED_FOR_IDLE_USER=1000
```

`WARNING` the `oauth2RefreshTokenBeforeExpirationTime` variable should be less than the `expiresIn` value of the token.

## Added end-points for oauth2

| Endpoint         | Method | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| /oauth2/logout   | GET    | Closes the session                       |
| /oauth2/callback | GET    | Where the microsoft service callbacks to |
| /oauth2/login    | GET    | Creates the session                      |
| /oauth2/ping     | GET    | Updates the idle time                    |
| /oauth2/refresh  | POST   | Refresh the authorization token          |

The login endpoint will create the session and redirect to the success page and the logout will destroy the session and then redirect to the login page.

The `/oauth2/refresh` will give the following response if a new token is generated:

```json
{
  "message": "New token generated",
  "code": 200001,
  "content": {
    "accessToken": "new token"
  }
}
```

## Start SPA server

Start your spa with `nodeboot-spa-server dist/template-dashboard -s settings.json --serverSettings server-settings.json -p 2000 --allow-routes`.

## Angular usage

### The login page

You need to have a login page with a button to redirect to the `/oauth2/login` endpoint. The button should have this logic:

```ts
window.location.href = window.location.hostname + "/oauth2/login";
```

### The success page

The page where the login process redirect to if done correctly.

### Recommended guards

Use angular guards so the login or success endpoint are available if the logic says so. For example a login guard will be in place if the user does not have the signedUserDetails object inside the extra settings of the settings.json endpoint.

### The interceptor for refresh

Using angular http interceptor you should intercept all 401 errors and if the code or error message is the one that signal an out of date token call the `/oauth2/refresh` endpoint to generate the new token then using RXJS retry the last HTTP call if the token was refresh successfully.

### Calling the ping endpoint

This could change in base of your project structure, but lest say that your parent component name is `success.component.ts` here you will need to use:

```ts
const clickObs = fromEvent(document, "click");
```

To get the event then pipe it and subtribe:

```ts
clickObs.pipe(debounceTime(5000)).subscribe({
  next: () => this.spaService.callPingEndpoint(),
});
```

This will call the endpoint for each click done in the document if 5 seconds from the last click have happened.

## Vanilla JS usage

### The login page

You need to have a login page with a button to redirect to the `/oauth2/login` endpoint. . The button should have this logic:

```js
window.location.href = window.location.hostname + "/oauth2/login";
```

### The success page

The page where the login process redirect to if done correctly.

### Calling the ping endpoint

You need to register a click event on the document:

```js
document.addEventListener("click", async () => {
  const newNowTime = Date.now();
  if (this.nowTime === 0 || newNowTime > this.nowTime + 5000) {
    await axios.get("/oauth2/ping");
  }
  this.nowTime = Date.now();
});
```

This will call the endpoint for each click done in the document if 5 seconds from the last click have happened.

## How does the security middleware works

The following diagram explains it:

![middleware diagram](https://i.ibb.co/Lr58f1P/VP7-DYjmm48-Jl-Ueews-X1-Oo-D5xs-P1-J88-UGp-Gie-Kjjka-Bi7-TMjsvkt-Z7p-E4-GEOYX5-Jz-LPNq-PXwhjw-M4-VHE.png)

## How does the login process works

<!-- @startuml
start
:Client activates SPA server login;
:Spa server calls the oauth2AuthorizeUrlEndpoint;
:Redirects to the microsoft login page;
:Calls the callback endpoint;
:Callback endpoint call the oauth2TokenUser endpoint;
if (The response status is 200) then (yes)
 :Creates the session;
 :Redirects to the success page;
else (no)
 :Response with a json object;
endif
stop
@enduml -->

![login diagram](https://i.ibb.co/Cmq5S2V/PP31-Ri8m38-Rl-UGe-Vsnl-Ys5r0r-Ux-JW0-S8g-Ki-D8-Qxokqp-Rqozqgu-R69-RAix-i-U0-Fps-QPh-T7-FXc-ZOA9o-CV.png)

## Contributors

<table>
  <tbody>
    <td>
      <img src="https://i.ibb.co/88Tp6n5/Recurso-7.png" width="100px;"/>
      <br />
      <label><a href="https://github.com/TacEtarip">Luis Huertas</a></label>
      <br />
    </td>
    <td>
      <img src="https://avatars.githubusercontent.com/u/92831091?s=200&v=4" width="100px;"/>
      <br />
      <label><a href="https://github.com/usil">Usil</a></label>
      <br />
    </td>
  </tbody>
</table>
