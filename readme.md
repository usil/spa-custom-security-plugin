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
  "plugins": [{ "module": "usil-oauth" }],
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

## Added end points for oauth2

| Endpoint       | Method | Description         |
| -------------- | ------ | ------------------- |
| /oauth2/logout | GET    | Closes the session  |
| /oauth2/login  | GET    | Creates the session |

## Start SPA server

Start your spa with `nodeboot-spa-server dist/template-dashboard -s settings.json --serverSettings server-settings.json -p 2000 --allow-routes`.

## Contributors

<table>
  <tbody>
    <td>
      <img src="https://i.ibb.co/88Tp6n5/Recurso-7.png" width="100px;"/>
      <br />
      <label><a href="https://github.com/TacEtarip">Luis Huertas</a></label>
      <br />
    </td>
  </tbody>
</table>
