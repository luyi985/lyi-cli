import { IPackageDataToAdd } from './types';
import { get } from 'lodash';
import config from '../config';
import execa from 'execa';
import fs from 'fs';
import fse from 'fs-extra';
import { promisify } from 'util';
import { Spinner } from 'cli-spinner';

const TS_ASSET_DIR = `${config.assetsDir}/tsdev`;

const errorHandling = (e: any) => {
	console.error(e);
};

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const copy = promisify(fse.copy);

const readJson = async (filePath: string) => {
	try {
		const jsonStr = await read(filePath);
		return JSON.parse(jsonStr.toString());
	} catch (e) {
		errorHandling(e);
	}
};

const checkAccess = async (path: string) => {
	try {
		await promisify(fs.access)(path);
		return true;
	} catch (e) {
		return false;
	}
};

const mkNewPackageJsonScratch = async (toAdd: IPackageDataToAdd) => {
	const newJsonLocation = `${config.toDir}/package.json`;
	try {
		await execa('npm', ['init', '-y']);
		const newJson = await readJson(newJsonLocation);
		if (!newJson) throw new Error('can not find newly inited package.json');
		newJson.devDependencies = toAdd.devDependencies;
		newJson.dependencies = toAdd.dependencies;
		newJson.scripts = toAdd.scripts;
		await write(newJsonLocation, JSON.stringify(newJson));
		return newJson;
	} catch (e) {
		errorHandling(e);
	}
};
const mkNewPackageJsonExisting = async (toAdd: IPackageDataToAdd) => {
	const newJsonLocation = `${config.toDir}/package.json`;
	try {
		const newJson = await readJson(newJsonLocation);
		if (!newJson) throw new Error('fail to load existing package.json');
		const scripts = { ...get(newJson, 'scripts', {}), ...toAdd.scripts };
		const devDependencies = { ...get(newJson, 'devDependencies'), ...toAdd.devDependencies };
		const dependencies = { ...get(newJson, 'dependencies'), ...toAdd.dependencies };
		newJson.devDependencies = devDependencies;
		newJson.dependencies = dependencies;
		newJson.scripts = scripts;
		await write(newJsonLocation, JSON.stringify(newJson));
		return newJson;
	} catch (e) {
		errorHandling(e);
	}
};

const mkNewPackageJson = async () => {
	try {
		const deps = await readJson(`${TS_ASSET_DIR}/package.json`);
		if (!deps) throw new Error('can not find predefined package.json');
		const { devDependencies, scripts, dependencies } = deps;
		const hasExistingPackageFile = await checkAccess(`${config.toDir}/package.json`);
		return hasExistingPackageFile
			? await mkNewPackageJsonExisting({ devDependencies, dependencies, scripts })
			: await mkNewPackageJsonScratch({ devDependencies, dependencies, scripts });
	} catch (e) {
		errorHandling(e);
	}
};

const copyFiles = async () => {
	const files = ['tsconfig.json', 'nodemon.json', 'jest.config.js', '.prettierrc', '.vscode', 'src', '.env'];
	try {
		await Promise.all(files.map(f => copy(`${TS_ASSET_DIR}/${f}`, `${config.toDir}/${f}`)));
	} catch (e) {
		errorHandling(e);
	}
};

export const initTs = async () => {
	const spin = new Spinner();
	spin.setSpinnerString('|/-\\');
	spin.start();
	try {
		spin.setSpinnerTitle('Make/update package.json...');
		const newJson = await mkNewPackageJson();
		if (!newJson) throw new Error('Fail to update/create package.json');
		spin.setSpinnerTitle('Prepare files...');
		await copyFiles();
		spin.setSpinnerTitle('Install dependencies...');
		await execa('npm', ['install']);
		spin.setSpinnerTitle('Run a simple test...');
		await execa('npm', ['test']);
		spin.stop();
		console.log('Success...');
	} catch (e) {
		errorHandling(e);
		spin.stop();
	}
};
