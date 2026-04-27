# JetBrains New UI File Icon Theme Extended for VS Code

The goal of the JetBrains New UI File Icon Theme Extended is to reduce visual clutter and give you more space for your code and thoughts.

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=r0kuko.jetbrains-newui-file-icon-theme):

![VS Code Marketplace Version](https://vsmarketplacebadges.dev/version-short/r0kuko.jetbrains-newui-file-icon-theme.svg?style=for-the-badge&colorA=555555&colorB=007ec6&label=VERSION)&nbsp;
![VS Code Marketplace Rating](https://vsmarketplacebadges.dev/rating-short/r0kuko.jetbrains-newui-file-icon-theme.svg?style=for-the-badge&colorA=555555&colorB=007ec6&label=RATING)&nbsp;
![VS Code Marketplace Downloads](https://vsmarketplacebadges.dev/downloads-short/r0kuko.jetbrains-newui-file-icon-theme.svg?style=for-the-badge&colorA=555555&colorB=007ec6&label=DOWNLOADS)&nbsp;
![VS Code Marketplace Installs](https://vsmarketplacebadges.dev/installs-short/r0kuko.jetbrains-newui-file-icon-theme.svg?style=for-the-badge&colorA=555555&colorB=007ec6&label=INSTALLS)

I hope this theme will be the one you enjoy working with day and night.

---

## Features

### Kotlin Content-Aware Icons

When enabled, `.kt` files are automatically assigned specific icons based on their content:

**Dark theme:**

![Kotlin Icons Dark](assets/img/kotlin-icons-dark.png)

**Light theme:**

![Kotlin Icons Light](assets/img/kotlin-icons-light.png)

The plugin detects the primary declaration type in each `.kt` file:
- `class` → Class icon
- `abstract class` → Abstract Class icon
- `interface` → Interface icon
- `object` → Object icon
- `enum class` → Enum icon
- `annotation class` → Annotation icon
- `typealias` → TypeAlias icon
- Mixed / no declarations → Default Kotlin icon

**Enable in settings:**

```json
"jetbrains-file-icon-theme.enableKotlinContentIcons": true
```

---

Check out other compatible extensions

| <img src="https://raw.githubusercontent.com/r0kuko/vscode-jetbrains-file-icon-theme/refs/heads/main/assets/img/icon.png" width="75"> |
| :----------------------------------------------------------------------------------------------------------------------------------: |
|                                               JetBrains New UI<br>**File Icon Theme**                                                |
|                                                             You are here                                                             |

## Credits

I express my deep gratitude to the JetBrains team for their work. Here are links to open resources used to create this theme:

- JetBrains icons: [https://jetbrains.design/intellij/resources/icons_list/](https://jetbrains.design/intellij/resources/icons_list/)
- JetBrains Mono font: [https://www.jetbrains.com/lp/mono/](https://www.jetbrains.com/lp/mono/)
