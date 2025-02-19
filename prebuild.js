/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const packageJson = require("./package.json")

const radixDependencies = Object.keys(packageJson.dependencies).filter((dep) => dep.startsWith("@radix-ui/"))

radixDependencies.forEach((dep) => {
  try {
    require.resolve(dep)
  } catch (e) {
    console.log(`${dep} not found. Installing...`)
    execSync(`npm install ${dep}`, { stdio: "inherit" })
  }
})

console.log("All Radix UI dependencies are installed.")

