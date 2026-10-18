// Strings that exist only in tms-app (Shortcut integration, sync differences).
export const RU_TMS_APP: Record<string, string> = {
  // Shortcut — project settings
  'Shortcut': 'Shortcut',
  'Create Shortcut stories from the repository and bug reports from runs and automation results.':
    'Создавайте истории Shortcut из репозитория и баг-репорты из прогонов и результатов автотестов.',
  'Repository stories': 'Истории из репозитория',
  'Bugs from runs': 'Баги из прогонов',
  'Bugs from automation': 'Баги из автотестов',
  'Using server environment settings': 'Используются настройки окружения сервера',
  'New stories → {state}': 'Новые истории → {state}',
  'API token and workflow state are required': 'Нужны API-токен и статус воркфлоу',
  'Only owners can change this': 'Изменять могут только владельцы',
  'No team': 'Без команды',
  'This project currently uses the SHORTCUT_* environment variables of the server. Saving settings here overrides them for this project.':
    'Сейчас проект использует переменные окружения SHORTCUT_* сервера. Настройки, сохранённые здесь, заменят их для этого проекта.',
  'Paste your Shortcut API token': 'Вставьте API-токен Shortcut',
  'Loading…': 'Загрузка…',
  'Load workflows and teams': 'Загрузить воркфлоу и команды',
  'Token OK — {name}': 'Токен работает — {name}',
  'Token OK': 'Токен работает',
  'Workflow state for new stories': 'Статус для новых историй',
  'Load workflows first': 'Сначала загрузите воркфлоу',
  'Workflow state': 'Статус воркфлоу',
  'Team (optional)': 'Команда (необязательно)',
  'Team': 'Команда',
  'Repository story type': 'Тип истории из репозитория',
  'Label (optional)': 'Метка (необязательно)',
  'Bug reports from runs and automation results are always created as Bug.':
    'Баг-репорты из прогонов и результатов автотестов всегда создаются с типом Bug.',
  'Remove the token and settings?': 'Удалить токен и настройки?',
  'Disconnecting...': 'Отключение...',
  'Disconnect': 'Отключить',
  'Shortcut → Settings → API Tokens': 'Shortcut → Settings → API Tokens',
  'and press “Create Token”.': 'и нажмите «Create Token».',
  'Choose “Custom permissions”: Read and Create Stories are enough. Full access is not needed.':
    'Выберите «Custom permissions»: достаточно Read и Create Stories. Полный доступ не нужен.',
  'Copy the token (Shortcut shows it only once), paste it above and press “Load workflows and teams”.':
    'Скопируйте токен (Shortcut показывает его только один раз), вставьте выше и нажмите «Загрузить воркфлоу и команды».',
  'Stories are created on behalf of the token owner. If the label does not exist in Shortcut yet, create it there or leave the label empty.':
    'Истории создаются от имени владельца токена. Если такой метки в Shortcut ещё нет, создайте её там или оставьте поле пустым.',
  'Could not load data from Shortcut.': 'Не удалось загрузить данные из Shortcut.',
  'Could not save Shortcut settings.': 'Не удалось сохранить настройки Shortcut.',
  'Could not check the connection.': 'Не удалось проверить подключение.',
  'Could not disconnect Shortcut.': 'Не удалось отключить Shortcut.',
  'Not connected': 'Не подключено',

  // Shortcut — bug report modal and repository story
  'Report bug in Shortcut': 'Завести баг в Shortcut',
  'Open in Shortcut': 'Открыть в Shortcut',
  'Bug title': 'Название бага',
  'Staging, Chrome 128...': 'Staging, Chrome 128...',
  'The story is created as a Bug; the context and links above are added to it automatically.':
    'История создаётся с типом Bug; контекст и ссылки выше добавляются в неё автоматически.',
  'Title is required.': 'Укажите название.',
  'Failed to create the Shortcut story.': 'Не удалось создать историю в Shortcut.',
  'Failed to create Shortcut story.': 'Не удалось создать историю в Shortcut.',
  'Creating story...': 'Создание истории...',
  'Create Shortcut story': 'Создать историю в Shortcut',
  'Open ticket': 'Открыть тикет',
  'Created Shortcut story: {name}': 'Создана история в Shortcut: {name}',

  // Repository, members, reports, runs
  'Title, e.g. BUG-123': 'Название, например BUG-123',
  'User email': 'Email пользователя',
  'Search by name or email': 'Поиск по имени или email',
  'Can view everything in the project, read-only.':
    'Видит всё в проекте, только чтение.',
  'Could not add the member.': 'Не удалось добавить участника.',
  'Aggregated execution across every run linked to a release.':
    'Сводное выполнение по всем прогонам, привязанным к релизу.',
  'total {count}': 'всего {count}',
  'Optional, e.g. 2.4.0': 'Необязательно, например 2.4.0',
  'Sort: by number': 'Сортировка: по номеру',
  'Needs attention first': 'Сначала требующие внимания',
  'By progress': 'По прогрессу',
  'All releases': 'Все релизы',
  'not started': 'не начат',
  '{count} executed': 'выполнено {count}',

  // Account
  'At least 8 characters': 'Минимум 8 символов',
  'Too short — {count} more characters': 'Слишком короткий — ещё символов: {count}',
  'Fair': 'Средний',
  'Strong': 'Надёжный',

  // Errors
  'The request was blocked by a network filter. The text probably contains a fragment that looks like an attack, such as a bash command, SQL or XML. Remove it and try again.':
    'Запрос заблокирован сетевым фильтром. Вероятно, в тексте есть фрагмент, похожий на атаку: bash-команда, SQL или XML. Уберите его и попробуйте снова.',
}
