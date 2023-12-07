const { parse } = require("url");
const { DEFAULT_HEADER } = require("./util/util.js");
const controller = require("./controller");
const { createReadStream } = require("fs");
const path = require("path");
// Function to get user data by username
function getUserDataByUsername(username) {


  return {
    profilePicturePath: path.join(__dirname, "photos", username, "profile.jpeg"),
  };
}

// Function to get profile picture path by username
function getProfilePicturePathByUsername(username) {
  const userData = getUserDataByUsername(username);

  // Check if user data exists and has a profilePicturePath property
  if (userData && userData.profilePicturePath) {
    return userData.profilePicturePath;
  }

  // Return null if no user data or profile picture path is found
  return null;
}

// Function to extract username from the URL
function getUsernameFromUrl(url) {
  const urlParts = url.split('/');
  
  const username = urlParts[2];

  return username;
}
const staticDirectory = path.join(__dirname, "public");

module.exports = async (request, response) => {
  try {
    const filePath = path.join(staticDirectory, request.url);
    const fileContent = await fs.readFile(filePath);

    response.writeHead(200, { 'Content-Type': 'text/css' });
    response.end(fileContent);
  } catch (error) {
    response.writeHead(404);
    response.end();
  }
};

const allRoutes = {
  "/profilePicture:get": async (request, response) => {
    const username = getUsernameFromUrl(request.url);

    if (!username) {
      response.writeHead(400, DEFAULT_HEADER);
      response.end("Username is missing in the URL");
      return;
    }

    const profilePicturePath = getProfilePicturePathByUsername(username);

    if (!profilePicturePath) {
      response.writeHead(404, DEFAULT_HEADER);
      response.end("Profile picture not found");
      return;
    }
    // Stream the image file
    createReadStream(profilePicturePath).pipe(response);
  },
  "/feedPics:get": async (request, response) => {
    controller.getFeedPics(request, response)
  },
  "/homePageCss:get":  (request, response) => {
    controller.getHomeCss(request,response)
  },
  "/feedCss:get":  (request, response) => {
    controller.getFeedCss(request,response)
  },
  "/igLogo:get": (request, response) => {
    controller.getLogo(request, response)
  },
  "/:get": (request, response) => {
    controller.getHome(request, response);
  },
  "/form:get": (request, response) => {
    controller.getFormPage(request, response);
  },
  "/form:post": (request, response) => {
    controller.sendFormData(request, response);
  },
  "/upload:post": (request, response) => {
    controller.uploadImages(request, response);
  },
  "/feed:get": (request, response) => {
    controller.getFeed(request, response);
  },
  "/profile/:username:get": (request, response) => {
    controller.getInstagramProfile(request, response);

    const userData = getUserDataByUsername(username);
    if (userData) {
      response.write(renderInstagramProfile(userData));
    } else {
      response.writeHead(404, DEFAULT_HEADER);
      response.write("User not found");
    }
    response.end();
  },
  default: (request, response) => {
    response.writeHead(404, DEFAULT_HEADER);
    createReadStream(path.join(__dirname, "views", "404.html"), "utf8").pipe(response);
  },
 
};
function handler(request, response) {
  const { url, method } = request;
  const { pathname } = parse(url, true);
  const key = `${pathname}:${method.toLowerCase()}`;
  const chosen = allRoutes[key] || allRoutes.default;
  // If the route is /profilePicture, call the /profilePicture:get handler
  if (pathname.startsWith("/profilePicture") && method.toLowerCase() === "get") {
    return Promise.resolve(allRoutes["/profilePicture:get"](request, response)).catch(
      handlerError(response)
    );
  }
  if (pathname.startsWith("/feedPics") && method.toLowerCase() === "get") {
    const urlParts = pathname.split("/");
    const username = urlParts[2];
    const photo = urlParts[3];
    request.username = username;
    request.photo = photo;
    return Promise.resolve(allRoutes["/feedPics:get"](request, response)).catch(
      handlerError(response)
    );
  }
  if (pathname.startsWith("/upload") && method.toLowerCase() === "post") {
    const urlParts = pathname.split("/");
    const username = urlParts[2];
    request.username = username;
    return Promise.resolve(allRoutes["/upload:post"](request, response)).catch(
      handlerError(response)
    );
  }

  return Promise.resolve(chosen(request, response)).catch(
    handlerError(response)
  );
}
function handlerError(response) {
  return (error) => {
    console.log("Something bad has happened**", error.stack);
    response.writeHead(500, DEFAULT_HEADER);
    response.write(
      JSON.stringify({
        error: "Internet server error!!",
      })
    );

    return response.end();
  };
}

module.exports = handler;
