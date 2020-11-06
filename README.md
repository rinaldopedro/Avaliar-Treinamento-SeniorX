# Avaliar-Treinamento-SeniorX
Este repositorio tem o objetivo de avaliar os aprendizados referentes o SDK e BPM na plataforma Senior X

Existem dois desafios, sendo o primeiro referente o SDK, que visa customizarmos ação padrões das telas existentes na plataforma, alterando o comportamento de alguns campos. O segundo desafio é criarmos um fluxo de aprovação de programação de férias individual. Nesta, o usuário logado terá que criar uma programação para si, enviara mesma para aprovaçãode sua chefia imediata, que por sua vez, se aprovado, encaminhar para o papel RH Férias.

Em ambos, a ideia é usar recursos nativos e recursos customizados.

# Para o SDK, o escopo do desafio foi dividido em duas partes. ##################################################################
# A primeira foi:
Desenvolver uma regra de validação na Admissão do Colaborador, na primitiva/hcm/payroll/employeeSave , para realizar as seguintes validações:
*  Validar obrigatoriedade do campo "Matrícula" (Esse campo nativamente não é obrigatório na G7) e não permitir realizar uma Admissão com o campo "Indicativo de Admissão" com o    valor diferente de "Normal". Esses dois campos estão presentes na aba Contrato da Tela de admissão.
*  Em uma alteração de colaborador (Colaborador anteriormente já cadastrado), implementar uma validação que impeça o usuário de alterar o nome do Colaborador.
   (Dica) O nome do colaborador presente no payload é o atual (possivelmente alterado) e o nome antigo (está salvo na base) estará na entidade employee. Dessa forma realizar uma      consulta na entidade de colaborador para realizar a comparação. Entidade: /hcm/payroll/entities/employee/
*  Para os colaboradores com tipo de contrato "1 - Empregado". A Escala selecionada deve obrigatoriamente estar no range de códigos de 1 a 10 e ser do tipo permanente. Qualquer      tipo diferente desse a admissão deve ser bloqueada, orientando o usuário através de uma mensagem de validação. (Dica) Lembrar que é necessário fazer uma consulta na entidade de    escalas para buscar essas informações.
   Essa consulta pode ser feita através de uma chamada GET na primitiva: /hcm/payroll/entities/workshift/, passando como parâmetro na rota o tableId da escala, obtida através do      payload da admissão. Essa chamada será necessária para buscar o código G5 da escala, bem como seu tipo "WorkshiftType". 

# A segunda foi:
Desenvolver uma regra de validação em uma primitiva de sua preferência. Pode ser tanto do módulo de Gestão de Departamento Pessoal ou uma da própria Plataforma. Entretanto, essa
validação deve obrigatoriamente atender aos seguintes requisitos:
* Possuir pelo menos uma chamada a outra primitiva da Plataforma, utilizando a biblioteca Axios.
* Utilizar de boas práticas de Javascript para codificar a customização. Ex. Divisão de lógica em funções separadas/ Arquivos distintos, nomes de funções autoexplicativas.
* Implementar um exemplo em que você acredite que seja um caso real. Algo que algum cliente pode solicitar em algum momento.

# Soluções SDK
* Para o primeiro desafio, o escopo foi claro e foram feitos os tratamentos solicitados. 
* Para o segundo, optei por fazer oseguinte:
  - Crie um processo que lê um webservice que criei na G5 e devolve se o cargo do colaborador necessita que o mesmo tenha uma CNH. Caso o cargo na G5 exija, e no cadastro do         colaborador, na G7, o campo CNH esteja em branco, o processo não permite que o registro seja salvo, apresentando uma mensagem.
  Esse recurso abre um leque grande, pois como a "ponte" foi estabelecida entre G7 e G5 pela customização podemos fazer qualquer ação.
  
  
# Para o BPM, o escopo do desafio foi: ##########################################################################################
* Permitir ao colaborador solicitar férias para si;
* Selecionar um dos períodos de férias em aberto;
* Se o período aquisitivo tiver data de vencimento futura, e não tiver nenhuma programação, projetar o saldo em 30 dias. Se já haver programações, descontar a quantidade já       programada do saldo no sistema;
* Período aquisitivo com data no passado em aberto, considerar o saldo no sistema;
* As férias poderão ser programadas em até 3 períodos, no primeiro período o usuário pode optar por abono e adiantamento de 13º salário;
* O total de dias programados (com abono se houver) deve totalizar o saldo, conforme regras acima;
* Após a solicitação, o fluxo segue para aprovação do gestor imediato (hierarquicamente acima);
* Após aprovação do gestor, o fluxo segue para análise do papel "RH Férias";
* Tanto gestor quanto RH podem recusar ou aprovar a solicitação; 
* Após aprovação final, deverão ser criadas as programações de férias no sistema G5, para o colaborador.

# Solucções BPM
* Não sei se haberá tempo hábil para testar todas as consistencias feitas, mas a tela verifica diversas situações:
  1) A data da programação de férias não pode ser anterior ao dia atual, e também não pode ser maior que o limite para o vencimento do 2º período aquisitivo;
  2) Finais de semana e feriados estão sendo checados;
  3) Quando há mais de uma programação para o mesmo período aquisitivo a consistência verifica as datas e não permitir interpolação de datas;
  4) Os dias de férias e abono estão sendo considerados em todo o tempo para a apuração do saldo;
  5) Caso haja uma programação anterior e a data de férias + dias da programação sejam maiores que a data sugerida de inicial das férias, está sendo validado;
  6) Há um consumo de WS já no inicio do fluxo, que tráz o nome, a chave do colaborador e uma lista de feriados, para podermos testar isso no fluxo;
  7) Conforme requisito, a chefia imediata vem do sistema;
        
