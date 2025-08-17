# Sistema de Inscrição - CAMPAL 2025 IPITINGA

Um sistema web para gerenciar inscrições do evento CAMPAL 2025, desenvolvido com React, TypeScript e Supabase.

## 🚀 Funcionalidades

- Formulário de inscrição responsivo
- Validação de dados em tempo real
- Seleção de distrito e igreja integrada
- Cálculo automático de idade
- Geração de comprovante em PDF
- Integração com banco de dados Supabase

## 🛠️ Tecnologias

- React
- TypeScript
- Tailwind CSS
- Shadcn/ui
- Supabase
- React Hook Form
- Zod
- jsPDF

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase

## ⚙️ Configuração

1. Clone o repositório:
```bash
git clone https://github.com/thiagosouza28/palavra-campal-inscritos-63.git
cd palavra-campal-inscritos-63
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas

**districts**
- id (uuid)
- name (text)
- created_at (timestamp)

**churches**
- id (uuid)
- name (text)
- district_id (uuid, foreign key)
- created_at (timestamp)

**registrations**
- id (uuid)
- full_name (text)
- birth_date (date)
- age (integer)
- district_id (uuid, foreign key)
- church_id (uuid, foreign key)
- created_at (timestamp)

## 📱 Interface

- Design responsivo para mobile e desktop
- Tema personalizado com cores do evento
- Feedback visual para ações do usuário
- Componentes acessíveis
- Loading states e validações

## 🔒 Segurança

- Validação de dados com Zod
- Proteção contra submissões duplicadas
- Sanitização de inputs
- Políticas de segurança do Supabase

## 📄 Comprovante

O sistema gera automaticamente um PDF com:
- Dados do inscrito
- Informações do evento
- Protocolo único
- Valor da inscrição
- Observações importantes

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## ✍️ Autor

Thiago Souza - [@thiagosouza28](https://github.com/thiagosouza28)

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

