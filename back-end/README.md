# Back-End

```json
{
  "name": "comp5567",
  "version": "1.0.0",
  "type": "module",
  "description": "group project",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "author": "Zachary Zhang",
  "repository": "https://github.com/zacharyzhang1208/COMP5567-Project.git",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

"type": "module" means that the code is written in ES6 modules.

"dependencies": 

1. cors is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.

2. express is a fast, unopinionated, minimalist web framework for node.js.

"devDependencies": 

1. nodemon is a tool that helps to develop node.js based applications by automatically restarting the node application when file changes in the directory are detected.
