import { getGraphClient } from '../lib/graphService';

const PARENT_PATH = 'Pruebas tecnicas';

export async function createExpedienteSharePoint(accessToken: string, folderName: string) {
  const client = await getGraphClient(accessToken);

  // Buscar sitio Documental
  const sitesRes = await client.api('/sites?search=Documental').get();
  const site = sitesRes?.value?.[0];
  if (!site) throw new Error('No se encontró el sitio Documental en SharePoint');

  // Encontrar biblioteca Expedientes
  const drivesRes = await client.api(`/sites/${site.id}/drives`).get();
  const drives: any[] = drivesRes?.value || [];
  const expDrive = drives.find((d: any) => d.name === 'Expedientes') ?? drives[0];
  if (!expDrive) throw new Error('No se encontró la biblioteca Expedientes');

  // Crear o recuperar carpeta del contrato
  let contratoFolder: any;
  try {
    contratoFolder = await client.api(`/drives/${expDrive.id}/root:/${PARENT_PATH}/${folderName}`).get();
  } catch {
    contratoFolder = await client.api(`/drives/${expDrive.id}/root:/${PARENT_PATH}:/children`).post({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
  }

  // Crear las tres subcarpetas principales
  const subfolders = ['01.Precontractual', '02.Contractual', '03.Postcontractual'];
  for (const sf of subfolders) {
    try {
      await client.api(`/drives/${expDrive.id}/root:/${PARENT_PATH}/${folderName}:/children`).post({
        name: sf,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      });
    } catch {
      // ya existe, continuar
    }
  }

  // Crear Entregables dentro de 02.Contractual
  try {
    await client.api(`/drives/${expDrive.id}/root:/${PARENT_PATH}/${folderName}/02.Contractual:/children`).post({
      name: 'Entregables',
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail',
    });
  } catch {
    // ya existe, continuar
  }

  return { success: true, folderUrl: contratoFolder?.webUrl };
}
