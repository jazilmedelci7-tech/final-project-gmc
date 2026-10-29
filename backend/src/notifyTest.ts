// Envoie un message de test au vétérinaire :  npm run notify-test
import mongoose from 'mongoose'
import { config } from './config.js'
import { notificationsEnabled, sendTelegram } from './notify.js'

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  if (!(await notificationsEnabled())) {
    console.error("Telegram n'est pas configuré. Configure-le dans l'espace vétérinaire, page « Notifications ».")
    process.exit(1)
  }
  await sendTelegram('Test : les notifications du cabinet fonctionnent. Tu recevras ici les rappels de vaccin à envoyer.')
  console.log(`Message de test envoyé (tous les jours à partir de ${config.notifyHour} h).`)
  await mongoose.disconnect()
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
