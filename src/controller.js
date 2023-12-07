const fs = require("fs");
const ejs = require('ejs');
const { DEFAULT_HEADER } = require("./util/util");
const path = require("path");
var qs = require("querystring");
const {formidable} = require("formidable")
const {rename, writeFile} = require("fs/promises")



  const streamFile = (filePath, response, contentType) => {
    
    const stream = fs.createReadStream(filePath);
  
    stream.on("open", () => {
      response.writeHead(200, { "Content-Type": contentType });
      stream.pipe(response);
    });
  
    stream.on("error", (err) => {
      console.error(`Error reading file: ${err.message}`);
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("File not found");
    });
  };
  const getContentType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".jpeg":
      case ".jpg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      default:
        return "text/plain";
    }
  };

  const getQueryParam = (reqUrl, paramName, host) => {
    const urlObj = new URL(reqUrl, `http://${host}`);
    return urlObj.searchParams.get(paramName);
  };
  const findUserByUsername = (users, username) => {
    return users.find((u) => u.username === username);
  };
 
const controller = {
    getHome: async (request, response) => {
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html");
  
      try {
        const filePath = path.join(__dirname, "..", "database", "data.json");
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const usersData = JSON.parse(fileContent);
  
        const userHTMLPromises = usersData.map(async (user) => {
          const profilePicturePath = path.join(__dirname, "photos", user.username, "profile.jpeg");
          const profilePicture = await fs.promises.readFile(profilePicturePath, { encoding: "base64" });
  
          return {
            username: user.username,
            profilePicture: profilePicture,
          };
        });
  
        const userHTMLData = await Promise.all(userHTMLPromises);
  
        const homePageHTML = await ejs.renderFile(
          path.join(__dirname, "public", "userCard.ejs"),
          { users: userHTMLData }
        );
        response.end(homePageHTML);
      } catch (error) {
        console.error("Error reading file:", error);
        response.end("Error reading file");
      }
    },

    getHomeCss: (request, response) => {
        const cssHomePath = path.join(__dirname, "public", "userCard.css")
        streamFile(cssHomePath, response, "text/css")
    },
    getFeedCss: (request, response) => {
        const cssHomePath = path.join(__dirname, "public", "feed.css")
        streamFile(cssHomePath, response, "text/css")
    },
    getLogo: (request, response) => {
      const logo = path.join(__dirname, "public", "instagramLogo.png")
      streamFile(logo, response, "image/png")
  },



    getInstagramProfile: (request, response) => {
        const { username } = request.params;
//createfunc    
        const userData = getUserDataByUsername(username);
    
        if (userData) {
          const profileHTML = renderInstagramProfile(userData);
          response.write(profileHTML);
        } else {
          response.writeHead(404, DEFAULT_HEADER);
          response.write("User not found");
        }
    
        response.end();
      },

      
  getFormPage: (request, response) => {
    return response.end(`
    <h1>Hello world</h1> <style> h1 {color:red;}</style>
    <form action="/form" method="post">
    <input type="text" name="username"><br>
    <input type="text" name="password"><br>
    <input type="submit" value="Upload">
    </form>
    `);
  },
  sendFormData: (request, response) => {
    var body = "";

    request.on("data", function (data) {
      body += data;
    });

    request.on("end", function () {
      var post = qs.parse(body);
      console.log(post);
    });
  },
  getFeedPics: async (request,response) => {
    const imagePath = path.join(__dirname, "photos", request.username, request.photo)
    streamFile(imagePath, response, getContentType(imagePath))
    
  },

  getFeed: async (request, response) => {
    try {
        const filePath = path.join(__dirname, "..", "database", "data.json");
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const usersData = JSON.parse(fileContent);
        const username = getQueryParam(
            request.url,
            "username",
            request.headers.host
          );
          const user = findUserByUsername(usersData, username)
        const feedHTML = await ejs.renderFile(
          path.join(__dirname, "public", "feed.ejs"),
          { user: user }
        );
        response.end(feedHTML);
      } catch (error) {
        console.error("Error reading file:", error);
        response.end("Error reading file");
      }
  },
  
    uploadImages: async (req, res) => {
    try {
        // Extract username from query parameters
        const username = getQueryParam(req.url, "username", req.headers.host);

        // Use the formidable library to parse the request
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        // Set up file paths
        const oldPath = files.upload[0].filepath;
        const filename = files.upload[0].originalFilename;
        const newPath = path.join(__dirname, "photos", username, filename);

        // Move the uploaded file to the destination directory
        await rename(oldPath, newPath);

        // Update user data with the new photo filename
        const filePath = path.join(__dirname, "..", "database", "data.json");
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const usersData = JSON.parse(fileContent);
        const user = findUserByUsername(usersData, username);

        if (user) {
            user.photos.push(filename);
            // Save the updated user data back to the file
            await fs.promises.writeFile(filePath, JSON.stringify(usersData, null, 2));
        }
        // Respond with success and details about the uploaded files
        res.writeHead(301, { Location: `/feed?username=${username}` });
        res.end(JSON.stringify({ fields, files }, null, 2));
    } catch (err) {
        // Handle errors and respond with an appropriate status code and message
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
    }}
};


module.exports = controller;
