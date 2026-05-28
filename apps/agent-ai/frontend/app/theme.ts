import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const theme = extendTheme({
  config,
  fonts: {
    heading: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  colors: {
    brand: {
      50: '#e9f6f3',
      100: '#cce7e0',
      200: '#9dd0c3',
      300: '#6db8a4',
      400: '#3fa086',
      500: '#146c5c',
      600: '#10594c',
      700: '#0d463d',
      800: '#09332d',
      900: '#06231f',
    },
  },
  radii: {
    md: '8px',
    lg: '10px',
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
      '*': {
        boxSizing: 'border-box',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'gray',
      },
      baseStyle: {
        fontWeight: 700,
        borderRadius: 'md',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          borderWidth: '1px',
          borderColor: 'gray.200',
          boxShadow: 'sm',
        },
      },
    },
  },
})

export default theme
