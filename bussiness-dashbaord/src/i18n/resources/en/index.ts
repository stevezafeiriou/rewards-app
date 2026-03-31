import auth from './auth'
import common from './common'
import customers from './customers'
import dashboard from './dashboard'
import navigation from './navigation'
import offers from './offers'
import onboarding from './onboarding'
import profile from './profile'
import settings from './settings'
import support from './support'
import validation from './validation'

const en = {
  common,
  navigation,
  auth,
  onboarding,
  dashboard,
  offers,
  customers,
  profile,
  settings,
  support,
  validation,
} as const

export default en
