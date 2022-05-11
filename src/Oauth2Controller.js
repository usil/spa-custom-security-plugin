const axios = require("axios").default;

class Oauth2Controller {
  constructor(serverSettings, logger) {
    this.serverSettings = serverSettings;
    this.logger = logger;
  }

  ping = (req, res) => {
    if (!req.session || !req.session.signedUserDetails) {
      return res.json({ updatedSessionAt: 0 });
    }
    req.session.signedUserDetails.tokenStatus = "stable";
    req.session.signedUserDetails.updatedSessionAt = Date.now();
    return res.json({
      updatedSessionAt: req.session.signedUserDetails.updatedSessionAt,
    });
  };

  logOut = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.send(err);
      }
      res.redirect(this.serverSettings.loginPage || "/");
    });
  };

  callback = async (req, res) => {
    try {
      if (req.session.signedUserDetails) {
        return res.redirect(this.serverSettings.loginPage || "/");
      }

      const processResponse = await axios.post(
        `${this.serverSettings.oauth2BaseUrl}${this.serverSettings.oauth2TokenUserEndpoint}`,
        {
          authorizationCode: req.query.code,
          grantType: "authorization_code",
          clientId: this.serverSettings.oauth2ClientId,
          applicationIdentifier: this.serverSettings.applicationIdentifier,
        }
      );

      if (processResponse.status === 200) {
        req.session.signedUserDetails = {
          ...processResponse.data.content,
          generatedAt: Date.now(),
          updatedSessionAt: Date.now(),
          tokenStatus: "created",
        };
        return res.redirect(this.serverSettings.successPage || "/");
      }

      // TODO add error page

      return res.json(processResponse.data);
    } catch (error) {
      this.handleAxiosError(error, res);
    }
  };

  logIn = async (req, res) => {
    try {
      if (req.session.signedUserDetails) {
        return res.redirect(this.serverSettings.successPage || "/");
      }
      const authorizationResponse = await axios.post(
        `${this.serverSettings.oauth2BaseUrl}${this.serverSettings.oauth2AuthorizeUrlEndpoint}`,
        { clientId: this.serverSettings.oauth2ClientId }
      );
      return res.status(302).redirect(authorizationResponse.data.content.url);
    } catch (error) {
      this.handleAxiosError(error, res);
    }
  };

  refreshToken = async (req, res) => {
    try {
      const idleTime =
        parseInt(this.serverSettings.oauth2MaxAllowedIdleTime) * 1000;

      const updatedSessionAt = req.session.signedUserDetails.updatedSessionAt;

      const now = Date.now();

      if (updatedSessionAt + idleTime < now) {
        const destroy$ = () => {
          return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
        };
        await destroy$();
        return res.status(403).json({
          message: "Session timeout due to idle time",
          code: 403001,
        });
      }

      const refreshResponse = await axios.post(
        `${this.serverSettings.oauth2BaseUrl}${this.serverSettings.oauth2RefreshTokenEndpoint}`,
        {
          refreshToken: req.session.signedUserDetails.refreshToken,
          grantType: "refresh_token",
        }
      );

      req.session.signedUserDetails.tokenStatus = "renewed";
      req.session.signedUserDetails.generatedAt = Date.now();
      req.session.signedUserDetails.accessToken =
        refreshResponse.data.content.accessToken;
      req.session.signedUserDetails.expiresIn =
        refreshResponse.data.content.expiresIn;

      return res.json({
        message: "New token generated",
        code: 200001,
        content: {
          accessToken: refreshResponse.data.content.accessToken,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error.response) {
        this.logger.error(error.response.data);
        this.logger.error(error.response.status);
        this.logger.error(error.response.headers);
        return res.json({
          message: error.message,
          responseData: error.response.data,
          responseStatus: error.response.status,
          responseHeader: error.response.headers,
        });
      }
      return res.json({ message: error.message });
    }
  };

  passSignedUser = (req, res, next) => {
    if (!req.session || !req.session.signedUserDetails) {
      if (res.locals["extraSettings"]) {
        delete res.locals["extraSettings"]["signedUserDetails"];
      }
      return next();
    }
    const signedUserDetails = { ...req.session.signedUserDetails };
    delete signedUserDetails["refreshToken"];
    if (res.locals["extraSettings"] === undefined) {
      res.locals["extraSettings"] = {
        signedUserDetails,
      };
    } else {
      res.locals["extraSettings"]["signedUserDetails"] = signedUserDetails;
    }
    return next();
  };

  oauth2Protection = async (req, res, next) => {
    try {
      const allowedExt = [
        ".js",
        ".ico",
        ".css",
        ".png",
        ".jpg",
        ".woff2",
        ".woff",
        ".ttf",
        ".svg",
        ".jpeg",
        ".json",
        ".webmanifest",
      ];

      const completeRequestUrl = req.baseUrl + req.path;

      const indexInPublicPages = serverSettings.publicPages.findIndex(
        (path) => {
          return completeRequestUrl.startsWith(path);
        }
      );

      if (
        completeRequestUrl === this.serverSettings.loginPage &&
        req.session.signedUserDetails
      ) {
        return res.redirect(this.serverSettings.successPage || "/");
      }

      if (
        completeRequestUrl === this.serverSettings.loginPage ||
        completeRequestUrl === this.serverSettings.errorPage ||
        indexInPublicPages > -1 ||
        allowedExt.filter((ext) => req.url.indexOf(ext) > 0).length > 0
      ) {
        return next();
      }

      if (!req.session.signedUserDetails) {
        if (this.serverSettings.loginPage) {
          return res.redirect(this.serverSettings.loginPage);
        }
        const authorizationResponse = await axios.post(
          `${this.serverSettings.oauth2BaseUrl}${this.serverSettings.oauth2AuthorizeUrlEndpoint}`,
          { clientId: this.serverSettings.oauth2ClientId }
        );
        return res.status(302).redirect(authorizationResponse.data.content.url);
      }
      return next();
    } catch (error) {
      this.handleAxiosError(error, res);
    }
  };

  handleAxiosError = (error, res) => {
    let errorData = {};
    this.logger.error(error);
    if (error.response) {
      errorData = {
        message: error.message,
        errorResponse: error.response.data,
        requestHeaders: error.response.headers,
        requestData: error.config.data,
        requestMethod: error.config.method,
        requestUrl: error.config.url,
      };
      this.logger.error(errorData);
    }
    if (this.serverSettings.errorPage) {
      return res.redirect(this.serverSettings.errorPage + `?code=500`);
    }
    return res.json(errorData);
  };
}

module.exports = Oauth2Controller;
