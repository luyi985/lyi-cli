import { config } from 'dotenv';
import { resolve } from 'path';

try {
	const c = config({ path: resolve(process.cwd(), '.env') });
	if (c.error) {
		throw c.error;
	}
} catch (e) {
	console.error(e);
}
